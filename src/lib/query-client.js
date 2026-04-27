import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			// Refetch every 30 seconds in the background to keep all devices in sync.
			// Individual queries can override this by passing refetchInterval: false
			// (e.g. when a form is open) to prevent data from refreshing mid-edit.
			refetchInterval: 30_000,
			refetchIntervalInBackground: false,  // only poll when tab is visible
			refetchOnWindowFocus: true,           // also re-sync when user switches back to tab
			staleTime: 10_000,                    // consider data fresh for 10s to avoid redundant fetches
			retry: 1,
		},
	},
});