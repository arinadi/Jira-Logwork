// The few extension APIs this app uses (tabs + scripting), declared here instead of adding @types/chrome.
declare namespace chrome {
  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      status?: string;
    }
    function query(queryInfo: { url?: string | string[] }): Promise<Tab[]>;
    function create(props: { url?: string; active?: boolean }): Promise<Tab>;
    function get(tabId: number): Promise<Tab>;
    function remove(tabId: number): Promise<void>;
    const onUpdated: {
      addListener(callback: (tabId: number, changeInfo: { status?: string }) => void): void;
      removeListener(callback: (tabId: number, changeInfo: { status?: string }) => void): void;
    };
  }
  namespace scripting {
    function executeScript<Args extends unknown[], Result>(injection: {
      target: { tabId: number };
      world?: 'MAIN' | 'ISOLATED';
      func: (...args: Args) => Result | Promise<Result>;
      args: Args;
    }): Promise<Array<{ result?: Result }>>;
  }
  namespace permissions {
    function getAll(): Promise<{ origins?: string[]; permissions?: string[] }>;
  }
}
