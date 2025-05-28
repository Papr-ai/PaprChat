'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileIcon, RefreshIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetcher } from '@/lib/utils';
import { SidebarToggle } from '@/components/sidebar-toggle';

interface SavedDocument {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
  chatId?: string | null;
}

// Cache key for saved pages
const SAVED_PAGES_CACHE_KEY = 'PaprChat_saved_pages';

// Function to get cached pages
const getCachedPages = (): SavedDocument[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(SAVED_PAGES_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.error('Error reading pages from cache:', e);
    return null;
  }
};

// Function to cache pages
const cachePages = (pages: SavedDocument[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_PAGES_CACHE_KEY, JSON.stringify(pages));
  } catch (e) {
    console.error('Error writing pages to cache:', e);
  }
};

export default function SavedPagesPage() {
  const router = useRouter();
  const [savedPages, setSavedPages] = useState<SavedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client-side
  useEffect(() => {
    setIsClient(true);
    // Load from cache immediately
    const cachedPages = getCachedPages();
    if (cachedPages) {
      setSavedPages(cachedPages);
      setIsLoading(false);
    }
  }, []);

  const fetchSavedPages = useCallback(async () => {
    try {
      if (!isClient) return;

      // Don't set loading to true if we already have cached data
      if (savedPages.length === 0) {
        setIsLoading(true);
      }

      setError(null);
      const result = await fetcher('/api/memories?type=documents');

      // Update state and cache
      setSavedPages(result || []);
      cachePages(result || []);
    } catch (err) {
      console.error('Error fetching saved pages:', err);
      setError(
        'Failed to load saved pages. There might be a database connection issue.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isClient, savedPages.length, setError, setIsLoading, setSavedPages]);

  useEffect(() => {
    if (isClient) {
      fetchSavedPages();
    }
  }, [isClient, fetchSavedPages]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
        <SidebarToggle />
        <div className="flex-1 overflow-hidden">
          <h1 className="text-lg font-semibold truncate">Artifacts</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-2">
        {isLoading && savedPages.length === 0 && (
          <div className="flex justify-center items-center py-12">
            <p>Loading artifacts...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
            <p className="mb-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={fetchSavedPages}
            >
              <RefreshIcon size={14} />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {!isLoading && !error && savedPages.length === 0 && (
          <div className="bg-muted p-8 rounded-lg text-center">
            <div className="flex justify-center mb-4">
              <FileIcon size={40} />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Saved Pages</h2>
            <p className="text-muted-foreground mb-4">
              You haven&apos;t saved any documents or pages yet.
            </p>
            <Button onClick={() => router.push('/')}>Start a new chat</Button>
          </div>
        )}

        {savedPages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mx-auto w-full px-0 md:px-2 lg:px-4">
            {savedPages.map((page) => (
              <Card
                key={page.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <Link
                  href={
                    page.chatId
                      ? `/chat/${page.chatId}?documentId=${page.id}&directOpen=true`
                      : '/'
                  }
                  className="block"
                >
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-lg font-medium">
                      {page.title ||
                        `Document from ${new Date(page.createdAt).toLocaleDateString()}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{page.kind}</span>
                      {!page.chatId && (
                        <span className="text-yellow-600">
                          (Original chat not found)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created on {new Date(page.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
