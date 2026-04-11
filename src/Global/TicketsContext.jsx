// import React, { createContext, useContext, useMemo, useReducer, useCallback } from "react";

// // Ticket shape reference used across the app:
// // {
// //   ticket_number, name, email, mobile, issue_description,
// //   agent_email, agent_name, status, site_id, created_at, websocket_url, token,
// // }

// const TicketsContext = createContext(null);

// function dedupeAndSortTickets(tickets) {
//   const map = new Map();
//   tickets.forEach((t) => {
//     if (!t || !t.ticket_number) return;
//     const existing = map.get(t.ticket_number) || {};
//     map.set(t.ticket_number, { ...existing, ...t });
//   });
//   return Array.from(map.values()).sort(
//     (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
//   );
// }

// const initialState = {
//   tickets: [],
// };

// function reducer(state, action) {
//   switch (action.type) {
//     case "REPLACE_TICKETS": {
//       return { ...state, tickets: dedupeAndSortTickets(action.payload || []) };
//     }
//     case "UPSERT_TICKETS": {
//       const merged = dedupeAndSortTickets([...(state.tickets || []), ...(action.payload || [])]);
//       return { ...state, tickets: merged };
//     }
//     case "UPDATE_TICKET": {
//       const { ticket_number, partial } = action.payload || {};
//       if (!ticket_number) return state;
//       const updated = (state.tickets || []).map((t) =>
//         t.ticket_number === ticket_number ? { ...t, ...partial } : t
//       );
//       return { ...state, tickets: updated };
//     }
//     default:
//       return state;
//   }
// }

// export function TicketsProvider({ children }) {
//   const [state, dispatch] = useReducer(reducer, initialState);

//   const replaceTickets = useCallback((tickets) => {
//     dispatch({ type: "REPLACE_TICKETS", payload: tickets || [] });
//   }, []);

//   const upsertTickets = useCallback((tickets) => {
//     if (!tickets) return;
//     const arr = Array.isArray(tickets) ? tickets : [tickets];
//     dispatch({ type: "UPSERT_TICKETS", payload: arr });
//   }, []);

//   const updateTicketPartial = useCallback((ticket_number, partial) => {
//     if (!ticket_number || !partial) return;
//     dispatch({ type: "UPDATE_TICKET", payload: { ticket_number, partial } });
//   }, []);

//   const value = useMemo(
//     () => ({
//       tickets: state.tickets,
//       replaceTickets,
//       upsertTickets,
//       updateTicketPartial,
//     }),
//     [state.tickets, replaceTickets, upsertTickets, updateTicketPartial]
//   );

//   return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
// }

// export function useTickets() {
//   const ctx = useContext(TicketsContext);
//   if (!ctx) {
//     throw new Error("useTickets must be used within a TicketsProvider");
//   }
//   return ctx;
// }


import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
} from "react";

/**
 * Ticket shape reference used across the app:
 * {
 *   ticket_number, name, email, mobile, issue_description,
 *   agent_email, agent_name, status, site_id,
 *   created_at, websocket_url, token
 * }
 */

const TicketsContext = createContext(null);

/** 🔁 Helper to remove duplicates and sort tickets by latest created_at */
function dedupeAndSortTickets(tickets) {
  const map = new Map();
  (tickets || []).forEach((t) => {
    if (!t?.ticket_number) return;
    const existing = map.get(t.ticket_number) || {};
    map.set(t.ticket_number, { ...existing, ...t });
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

/** 🧩 Initial state */
const initialState = {
  tickets: [],
};

/** 🧠 Reducer to manage ticket operations */
function reducer(state, action) {
  switch (action.type) {
    case "REPLACE_TICKETS":
      return { ...state, tickets: dedupeAndSortTickets(action.payload) };

    case "UPSERT_TICKETS": {
      const merged = dedupeAndSortTickets([
        ...(state.tickets || []),
        ...(action.payload || []),
      ]);
      return { ...state, tickets: merged };
    }

    case "UPDATE_TICKET": {
      const { ticket_number, partial } = action.payload || {};
      if (!ticket_number) return state;
      const updated = (state.tickets || []).map((t) =>
        t.ticket_number === ticket_number ? { ...t, ...partial } : t
      );
      return { ...state, tickets: updated };
    }

    case "DELETE_TICKET":
      return {
        ...state,
        tickets: (state.tickets || []).filter(
          (t) => t.ticket_number !== action.payload
        ),
      };

    default:
      return state;
  }
}

/** ⚙️ TicketsProvider */
export function TicketsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Replace all tickets */
  const replaceTickets = useCallback(
    (tickets) => dispatch({ type: "REPLACE_TICKETS", payload: tickets || [] }),
    []
  );

  /** Insert or update ticket(s) */
  const upsertTickets = useCallback((tickets) => {
    if (!tickets) return;
    const arr = Array.isArray(tickets) ? tickets : [tickets];
    dispatch({ type: "UPSERT_TICKETS", payload: arr });
  }, []);

  /** Partially update one ticket */
  const updateTicketPartial = useCallback((ticket_number, partial) => {
    if (!ticket_number || !partial) return;
    dispatch({ type: "UPDATE_TICKET", payload: { ticket_number, partial } });
  }, []);

  /** Delete a ticket */
  const deleteTicket = useCallback((ticket_number) => {
    if (!ticket_number) return;
    dispatch({ type: "DELETE_TICKET", payload: ticket_number });
  }, []);

  /** 💾 Optional persistence to localStorage */
  useEffect(() => {
    localStorage.setItem("tickets", JSON.stringify(state.tickets));
  }, [state.tickets]);

  /** 🚀 Load persisted tickets on first mount */
  useEffect(() => {
    const saved = localStorage.getItem("tickets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        replaceTickets(parsed);
      } catch (err) {
        console.error("[TicketsContext] Failed to load saved tickets:", err);
      }
    }
  }, [replaceTickets]);

  /** Memoized value */
  const value = useMemo(
    () => ({
      tickets: state.tickets,
      replaceTickets,
      upsertTickets,
      updateTicketPartial,
      deleteTicket,
    }),
    [state.tickets, replaceTickets, upsertTickets, updateTicketPartial, deleteTicket]
  );

  return (
    <TicketsContext.Provider value={value}>
      {children}
    </TicketsContext.Provider>
  );
}

/** 🧩 Custom Hook */
export function useTickets() {
  const ctx = useContext(TicketsContext);
  if (!ctx) {
    console.error("❌ useTickets() called outside <TicketsProvider>");
    console.trace();
    throw new Error("useTickets must be used within a TicketsProvider");
  }
  return ctx;
}
