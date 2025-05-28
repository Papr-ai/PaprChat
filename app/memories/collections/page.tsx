'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { SidebarToggle } from '@/components/sidebar-toggle';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  categorizeAndSaveChats,
  getAllCollections,
  type Collection,
} from '../chat-categorizer';

interface ChatInfo {
  id: string;
  title: string;
  createdAt?: string;
}

// Cache key for collections
const COLLECTIONS_CACHE_KEY = 'PaprChat_collections';
const CHATS_CACHE_KEY = 'PaprChat_collection_chats';

// Function to get cached collections
const getCachedCollections = (): Collection[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(COLLECTIONS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.error('Error reading collections from cache:', e);
    return null;
  }
};

// Function to cache collections
const cacheCollections = (collections: Collection[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLLECTIONS_CACHE_KEY, JSON.stringify(collections));
  } catch (e) {
    console.error('Error writing collections to cache:', e);
  }
};

// Function to get cached chats
const getCachedChats = (): Map<string, ChatInfo> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CHATS_CACHE_KEY);
    if (!cached) return null;

    const chatArray: [string, ChatInfo][] = JSON.parse(cached);
    return new Map(chatArray);
  } catch (e) {
    console.error('Error reading chats from cache:', e);
    return null;
  }
};

// Function to cache chats
const cacheChats = (chats: Map<string, ChatInfo>) => {
  if (typeof window === 'undefined') return;
  try {
    const chatArray = Array.from(chats.entries());
    localStorage.setItem(CHATS_CACHE_KEY, JSON.stringify(chatArray));
  } catch (e) {
    console.error('Error writing chats to cache:', e);
  }
};

export default function CollectionsPage() {
  const router = useRouter();

  // States for collections
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allChats, setAllChats] = useState<Map<string, ChatInfo>>(new Map());

  // Shared states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Load from cache immediately if available
    const cachedCollections = getCachedCollections();
    const cachedChats = getCachedChats();

    if (cachedCollections) {
      setCollections(cachedCollections);
    }

    if (cachedChats) {
      setAllChats(cachedChats);
    }

    if (cachedCollections && cachedChats) {
      setIsLoading(false);
    }
  }, []);

  const fetchUserData = async () => {
    try {
      // Get user session data
      const userResponse = await fetch('/api/user');
      if (!userResponse.ok) throw new Error('Failed to get user session');
      const userData = await userResponse.json();
      setUserId(userData.id);
      return userData.id;
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
      return null;
    }
  };

  const fetchCollections = useCallback(
    async (uid: string) => {
      try {
        // Don't set loading to true if we already have cached data
        if (collections.length === 0) {
          setIsLoading(true);
        }

        // First, make sure any uncategorized chats are categorized
        await categorizeAndSaveChats(uid);

        // Fetch all collections including the special Saved Chats collection
        const collectionsData = await getAllCollections(uid);

        // Sort collections to ensure Saved Chats is first
        const sortedCollections = [...collectionsData].sort((a, b) => {
          // First check for systemType === 'saved_chats'
          if (a.systemType === 'saved_chats') return -1;
          if (b.systemType === 'saved_chats') return 1;
          // Then check for isSystem
          if (a.isSystem && !b.isSystem) return -1;
          if (!a.isSystem && b.isSystem) return 1;
          // Finally sort by title
          return a.title.localeCompare(b.title);
        });

        setCollections(sortedCollections);
        // Cache the collections
        cacheCollections(sortedCollections);

        // Fetch all chats for the user
        const chatsResponse = await fetch(`/api/chats?userId=${uid}`);
        if (!chatsResponse.ok) throw new Error('Failed to fetch chats');
        const chats = await chatsResponse.json();

        // Create a map of all chats for easy lookup
        const chatMap = new Map<string, ChatInfo>();
        chats.forEach((chat: any) => {
          chatMap.set(chat.id, {
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt,
          });
        });
        setAllChats(chatMap);
        // Cache the chats
        cacheChats(chatMap);
      } catch (err) {
        console.error('Error loading collections:', err);
        setError('Failed to load collections');
      } finally {
        setIsLoading(false);
      }
    },
    [collections.length, setAllChats, setCollections, setError, setIsLoading],
  );

  useEffect(() => {
    async function loadData() {
      try {
        if (!isClient) return;

        setError(null);

        const uid = await fetchUserData();
        if (uid) {
          await fetchCollections(uid);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Something went wrong. Please try again later.');
      }
    }

    loadData();
  }, [isClient, fetchCollections]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
        <SidebarToggle />
        <div className="flex-1 overflow-hidden flex items-center gap-2">
          <h1 className="text-lg font-semibold truncate">Chat Collections</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading && collections.length === 0 && (
          <div className="flex justify-center items-center py-12">
            <p>Loading collections...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
            <p className="mb-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => {
                if (userId) fetchCollections(userId);
              }}
            >
              <div className="mr-2">
                <RefreshIcon size={14} />
              </div>
              <span>Retry</span>
            </Button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Chat Collections Section */}
            <section className="mb-8">
              {collections.length > 0 ? (
                <Accordion type="multiple" className="space-y-4">
                  {collections.map((collection) => {
                    const collectionChats = collection.chatIds
                      .map((id) => allChats.get(id))
                      .filter((chat): chat is ChatInfo => chat !== undefined);

                    return (
                      <AccordionItem
                        key={collection.id}
                        value={collection.id}
                        className="border rounded-lg p-1"
                      >
                        <AccordionTrigger className="px-4">
                          <div className="flex flex-col items-start text-left">
                            <h3 className="text-lg font-semibold">
                              {collection.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {collection.description}
                            </p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-2">
                          <div className="grid gap-2">
                            {collectionChats.length > 0 ? (
                              collectionChats.map((chat) => (
                                <Link
                                  key={chat.id}
                                  href={`/chat/${chat.id}`}
                                  className="block p-2 hover:bg-accent rounded transition-colors"
                                >
                                  {chat.title}
                                </Link>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground py-2">
                                No chats in this collection
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Collections Yet</CardTitle>
                    <CardDescription>
                      Start chatting more to generate collections automatically.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
