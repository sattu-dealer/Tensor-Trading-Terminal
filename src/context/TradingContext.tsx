"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type OrderType = "BUY" | "SELL";
export type PositionType = "LONG" | "SHORT";

export interface Position {
  id: string;
  symbol: string;
  instrument_type: string;
  security_id: number;
  exchange: string;
  quantity: number;
  averagePrice: number;
  lastKnownLtp: number;
  type: PositionType;
  isClosed: boolean;
  realisedPnL: number;
  date: string;
}

export interface Order {
  id: string;
  symbol: string;
  instrument_type: string;
  security_id: number;
  exchange: string;
  type: OrderType;
  quantity: number;
  limitPrice: number | null;
  status: "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED";
  timestamp: number;
  marginBlocked: number;
}

export interface PlaceOrderPayload {
  symbol: string;
  instrument_type: string;
  security_id: number;
  exchange: string;
  type: OrderType;
  quantity: number;
  limitPrice: number | null;
  currentLtp: number;
}

export interface WatchlistItem {
  symbol: string;
  security_id: number;
  exchange: string;
  instrument_type: string;
}

interface TradingContextState {
  funds: number;
  positions: Position[];
  orders: Order[];
  watchlist: WatchlistItem[];
  marginBlocked: number;
  marginAvailable: number;
  addFunds: (amount: number) => void;
  withdrawFunds: (amount: number) => void;
  placeOrder: (payload: PlaceOrderPayload) => { success: boolean, message: string };
  cancelOrder: (id: string) => void;
  executeOrder: (orderId: string, executionPrice: number) => void;
  squareOff: (positionId: string, currentPrice: number) => void;
  toggleWatchlist: (item: WatchlistItem) => void;
  reorderWatchlist: (newList: WatchlistItem[]) => void;
  resetMemory: () => void;
}

const defaultState: TradingContextState = {
  funds: 100000, 
  positions: [],
  orders: [],
  watchlist: [],
  marginBlocked: 0,
  marginAvailable: 100000,
  addFunds: () => {},
  withdrawFunds: () => {},
  placeOrder: () => ({ success: false, message: "Not initialized" }),
  cancelOrder: () => {},
  executeOrder: () => {},
  squareOff: () => {},
  toggleWatchlist: () => {},
  reorderWatchlist: () => {},
  resetMemory: () => {},
};

export const TradingContext = createContext<TradingContextState>(defaultState);

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const calculateCharges = (instrument_type: string, qty: number, price: number) => {
   if (instrument_type.includes('FUT') || instrument_type.includes('OPT')) {
      return 25.0; 
   } else {
      return Math.min((qty * price) * 0.0003, 20.0);
   }
};

const getBaseAndExpiry = (symbol: string) => {
   const parts = symbol.split('-');
   if (parts.length < 3) return { base: symbol, expiry: null, strike: null, option: null };
   
   const base = parts[0];
   const expiry = parts[1];
   let strike = null;
   let option = null;

   if (parts.length === 4) {
       strike = parseFloat(parts[2]);
       option = parts[3];
   }
   return { base, expiry, strike, option };
};

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [funds, setFunds] = useState(defaultState.funds);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const computeMarginBlocked = () => {
     let totalMargin = 0;
     
     orders.filter(o => o.status === "PENDING").forEach(o => {
         totalMargin += o.marginBlocked;
     });

     const openPositions = positions.filter(p => !p.isClosed);
     const byBase: Record<string, Position[]> = {};
     
     openPositions.forEach(p => {
         const { base } = getBaseAndExpiry(p.symbol);
         if (!byBase[base]) byBase[base] = [];
         byBase[base].push(p);
     });

     Object.values(byBase).forEach(group => {
         const eqPos = group.filter(p => p.instrument_type === 'EQ' || p.instrument_type === 'ES');
         eqPos.forEach(p => {
             totalMargin += (p.quantity * p.averagePrice) * 0.20; 
         });

         const derivPos = group.filter(p => p.instrument_type.includes('FUT') || p.instrument_type.includes('OPT'));
         const byExpiry: Record<string, Position[]> = {};
         
         derivPos.forEach(p => {
             const { expiry } = getBaseAndExpiry(p.symbol);
             if (expiry) {
                 if (!byExpiry[expiry]) byExpiry[expiry] = [];
                 byExpiry[expiry].push(p);
             }
         });

         Object.values(byExpiry).forEach(expGroup => {
             let shortCalls: any[] = [];
             let longCalls: any[] = [];
             let shortPuts: any[] = [];
             let longPuts: any[] = [];
             let futMargin = 0;

             expGroup.forEach(p => {
                 if (p.instrument_type.includes('FUT')) {
                     futMargin += (p.quantity * p.averagePrice) * 0.15;
                 } else if (p.instrument_type.includes('OPT')) {
                     const { strike, option } = getBaseAndExpiry(p.symbol);
                     if (strike && option) {
                         const item = { strike, qty: p.quantity, price: p.averagePrice };
                         if (option === 'CE') {
                             if (p.type === 'SHORT') shortCalls.push(item);
                             else longCalls.push(item);
                         } else {
                             if (p.type === 'SHORT') shortPuts.push(item);
                             else longPuts.push(item);
                         }
                     }
                 }
             });

             totalMargin += futMargin;

             shortCalls.sort((a,b) => a.strike - b.strike);
             longCalls.sort((a,b) => a.strike - b.strike);
             shortCalls.forEach(sc => {
                 let remainingQty = sc.qty;
                 for (let i = 0; i < longCalls.length; i++) {
                     const lc = longCalls[i];
                     if (lc.strike > sc.strike && lc.qty > 0 && remainingQty > 0) {
                         const matchQty = Math.min(remainingQty, lc.qty);
                         totalMargin += matchQty * (lc.strike - sc.strike); 
                         lc.qty -= matchQty;
                         remainingQty -= matchQty;
                     }
                 }
                 if (remainingQty > 0) {
                     totalMargin += (sc.strike * remainingQty) * 0.15; 
                 }
             });

             shortPuts.sort((a,b) => b.strike - a.strike);
             longPuts.sort((a,b) => b.strike - a.strike);
             shortPuts.forEach(sp => {
                 let remainingQty = sp.qty;
                 for (let i = 0; i < longPuts.length; i++) {
                     const lp = longPuts[i];
                     if (lp.strike < sp.strike && lp.qty > 0 && remainingQty > 0) {
                         const matchQty = Math.min(remainingQty, lp.qty);
                         totalMargin += matchQty * (sp.strike - lp.strike); 
                         lp.qty -= matchQty;
                         remainingQty -= matchQty;
                     }
                 }
                 if (remainingQty > 0) {
                     totalMargin += (sp.strike * remainingQty) * 0.15; 
                 }
             });
         });
     });

     return totalMargin;
  };

  const marginBlocked = computeMarginBlocked();
  const marginAvailable = funds - marginBlocked;

  // Load from Memory API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/memory");
        if (res.ok) {
          const { data: parsed } = await res.json();
          if (parsed) {
            let loadedFunds = parsed.funds ?? defaultState.funds;
            let loadedPositions: Position[] = parsed.positions ?? []; // Note: only live positions are saved
        let loadedWatchlist: WatchlistItem[] = parsed.watchlist ?? [];
        let loadedOrders: Order[] = parsed.orders ?? [];
        
        const todayString = new Date().toDateString();
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let silentSettleFunds = 0;

        loadedPositions = loadedPositions.filter(p => {
           if (p.instrument_type.includes('FUT') || p.instrument_type.includes('OPT')) {
               const { expiry } = getBaseAndExpiry(p.symbol);
               if (expiry) {
                   const expDate = new Date(expiry.replace('-', ' '));
                   if (!isNaN(expDate.getTime()) && expDate < today) {
                       // Silently settle with last known LTP
                       let pnl = 0;
                       if (p.type === "LONG") {
                           pnl = (p.lastKnownLtp - p.averagePrice) * p.quantity;
                       } else {
                           pnl = (p.averagePrice - p.lastKnownLtp) * p.quantity;
                       }
                       // For options, premium already deducted/added. We do NOT add PnL to funds for options!
                       if (!p.instrument_type.includes('OPT')) {
                           silentSettleFunds += pnl;
                       }
                       return false; // Discard from memory
                   }
               }
           }
           return true;
        });

        loadedWatchlist = loadedWatchlist.filter(w => {
           if (w.instrument_type.includes('FUT') || w.instrument_type.includes('OPT')) {
               const { expiry } = getBaseAndExpiry(w.symbol);
               if (expiry) {
                   const expDate = new Date(expiry.replace('-', ' '));
                   if (!isNaN(expDate.getTime()) && expDate < today) {
                       return false; 
                   }
               }
           }
           return true;
        });

        setFunds(loadedFunds + silentSettleFunds);
        setPositions(loadedPositions);
        setWatchlist(loadedWatchlist);
        
            loadedOrders = loadedOrders.filter(o => new Date(o.timestamp).toDateString() === todayString && o.status !== "PENDING");
            setOrders(loadedOrders);
          }
        }
      } catch (e) { }
      setIsLoaded(true);
    })();
  }, []);

  // Save to Memory API
  useEffect(() => {
    if (!isLoaded) return;
    // We only save funds, LIVE positions, watchlist, and non-pending orders.
    const livePositions = positions.filter(p => !p.isClosed);
    const completedOrders = orders.filter(o => o.status !== "PENDING");
    const payload = { funds, positions: livePositions, watchlist, orders: completedOrders };
    
    fetch("/api/memory", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(payload)
    }).catch(e => console.error("Memory sync failed", e));
  }, [funds, positions, watchlist, orders, isLoaded]);

  // Periodic LTP fetching to update lastKnownLtp in memory
  useEffect(() => {
    const livePositions = positions.filter(p => !p.isClosed);
    if (livePositions.length === 0) return;

    const fetchPrices = async () => {
      const prefs = livePositions.filter(p => p.security_id).map(p => `${p.exchange}:${p.security_id}:LTP`);
      if (prefs.length === 0) return;
      try {
        const res = await fetch(`/api/portfolio/live?prefs=${prefs.join(",")}`);
        const data = await res.json();
        if (!data.error) {
            setPositions(prev => prev.map(p => {
               if (p.isClosed || !p.security_id) return p;
               const newLtp = data[p.security_id.toString()];
               if (newLtp != null && newLtp > 0) { // Do not replace with 0 if market closed
                   return { ...p, lastKnownLtp: newLtp };
               }
               return p;
            }));
        }
      } catch (e) {}
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, [positions.length]); // Dependency on length so it doesn't infinite loop on positions update

  const addFunds = (amt: number) => setFunds(f => f + amt);
  const withdrawFunds = (amt: number) => {
     if (amt <= marginAvailable) setFunds(f => f - amt);
  };

  const placeOrder = (payload: PlaceOrderPayload) => {
     const price = payload.limitPrice || payload.currentLtp;
     
     let reqMargin = 0;
     if (payload.instrument_type === 'EQ' || payload.instrument_type === 'ES') {
         reqMargin = (payload.quantity * price) * 0.20;
     } else if (payload.instrument_type.includes('FUT')) {
         reqMargin = (payload.quantity * price) * 0.15;
     } else if (payload.instrument_type.includes('OPT')) {
         if (payload.type === 'BUY') {
             reqMargin = payload.quantity * price;
         } else {
             const { strike } = getBaseAndExpiry(payload.symbol);
             const strikeVal = strike || (price * 100);
             reqMargin = (payload.quantity * strikeVal) * 0.15;
         }
     }

     if (reqMargin > marginAvailable) {
         return { success: false, message: `Insufficient Margin. Required: ₹${reqMargin.toFixed(2)}, Available: ₹${marginAvailable.toFixed(2)}` };
     }

     const order: Order = {
        id: Math.random().toString(36).substring(2, 9),
        symbol: payload.symbol,
        instrument_type: payload.instrument_type,
        security_id: payload.security_id,
        exchange: payload.exchange,
        type: payload.type,
        quantity: payload.quantity,
        limitPrice: payload.limitPrice,
        status: "PENDING",
        timestamp: Date.now(),
        marginBlocked: reqMargin
     };

     setOrders(prev => [...prev, order]);
     return { success: true, message: "Order placed successfully" };
  };

  const cancelOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "CANCELLED", marginBlocked: 0 } : o));
  };

  const executeOrder = (orderId: string, executionPrice: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== "PENDING") return;
    
    const o: Order = { ...order, status: "EXECUTED", marginBlocked: 0 };
    setOrders(prev => prev.map(x => x.id === orderId ? o : x));

    const charges = calculateCharges(o.instrument_type, o.quantity, executionPrice);
    
    setFunds(prevFunds => {
        let newFunds = prevFunds - charges;
        if (o.instrument_type.includes('OPT') && o.type === 'BUY') {
            newFunds -= (o.quantity * executionPrice);
        }
        if (o.instrument_type.includes('OPT') && o.type === 'SELL') {
            newFunds += (o.quantity * executionPrice);
        }
        return newFunds;
    });

    setPositions(prev => {
        const today = getTodayDateString();
        const existing = prev.find(p => p.symbol === o.symbol && !p.isClosed);

        if (!existing) {
            return [...prev, {
                id: Math.random().toString(36).substring(2, 9),
                symbol: o.symbol,
                instrument_type: o.instrument_type,
                security_id: o.security_id,
                exchange: o.exchange,
                quantity: o.quantity,
                averagePrice: executionPrice,
                lastKnownLtp: executionPrice,
                type: o.type === "BUY" ? "LONG" : "SHORT",
                isClosed: false,
                realisedPnL: 0,
                date: today
            }];
        }

        const isAdding = (existing.type === "LONG" && o.type === "BUY") || (existing.type === "SHORT" && o.type === "SELL");

        if (isAdding) {
            return prev.map(p => p.id === existing.id ? {
                ...p,
                quantity: p.quantity + o.quantity,
                averagePrice: ((p.quantity * p.averagePrice) + (o.quantity * executionPrice)) / (p.quantity + o.quantity),
                lastKnownLtp: executionPrice
            } : p);
        } else {
            let pnl = 0;
            if (existing.type === "LONG") {
                pnl = (executionPrice - existing.averagePrice) * Math.min(existing.quantity, o.quantity);
            } else {
                pnl = (existing.averagePrice - executionPrice) * Math.min(existing.quantity, o.quantity);
            }
            
            if (!o.instrument_type.includes('OPT')) {
                setFunds(f => f + pnl);
            }

            const newQty = existing.quantity - o.quantity;
            
            if (newQty === 0) {
                return prev.map(p => p.id === existing.id ? { ...p, quantity: 0, isClosed: true, realisedPnL: p.realisedPnL + pnl, lastKnownLtp: executionPrice } : p);
            } else if (newQty > 0) {
                return prev.map(p => p.id === existing.id ? { ...p, quantity: newQty, realisedPnL: p.realisedPnL + pnl, lastKnownLtp: executionPrice } : p);
            } else {
                return [
                    ...prev.map(p => p.id === existing.id ? { ...p, quantity: 0, isClosed: true, realisedPnL: p.realisedPnL + pnl, lastKnownLtp: executionPrice } : p),
                    {
                        id: Math.random().toString(36).substring(2, 9),
                        symbol: o.symbol,
                        instrument_type: o.instrument_type,
                        security_id: o.security_id,
                        exchange: o.exchange,
                        quantity: Math.abs(newQty),
                        averagePrice: executionPrice,
                        lastKnownLtp: executionPrice,
                        type: o.type === "BUY" ? "LONG" : "SHORT",
                        isClosed: false,
                        realisedPnL: 0,
                        date: today
                    }
                ];
            }
        }
    });
  };

  const squareOff = (positionId: string, currentPrice: number) => {
    const position = positions.find(p => p.id === positionId && !p.isClosed);
    if (!position) return;

    placeOrder({
       symbol: position.symbol,
       instrument_type: position.instrument_type,
       security_id: position.security_id,
       exchange: position.exchange,
       type: position.type === "LONG" ? "SELL" : "BUY",
       quantity: position.quantity,
       limitPrice: null, 
       currentLtp: currentPrice
    });
  };

  const toggleWatchlist = (item: WatchlistItem) => {
    setWatchlist(prev => {
      const exists = prev.some(w => w.symbol === item.symbol);
      if (exists) {
        return prev.filter(w => w.symbol !== item.symbol);
      } else {
        return [...prev, item];
      }
    });
  };

  const reorderWatchlist = (newList: WatchlistItem[]) => {
    setWatchlist(newList);
  };

  const resetMemory = () => {
    setPositions([]);
    setOrders([]);
    setFunds(defaultState.funds);
    // Optionally also clear watchlist? User requested positions/orders and funds. We'll leave watchlist intact.
  };

  return (
    <TradingContext.Provider value={{ funds, positions, orders, watchlist, marginBlocked, marginAvailable, addFunds, withdrawFunds, placeOrder, cancelOrder, executeOrder, squareOff, toggleWatchlist, reorderWatchlist, resetMemory }}>
      {children}
    </TradingContext.Provider>
  );
}

export const useTrading = () => useContext(TradingContext);
