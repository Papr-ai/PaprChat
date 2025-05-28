'use client';

import { useEffect, useState } from 'react';
import { useArtifact } from '@/hooks/use-artifact';
import { fetcher } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';

interface DocumentOpenerProps {
  documentId: string;
}

// Cache key prefix for documents
const DOCUMENT_CACHE_KEY = 'PaprChat_document_';

// Function to get cached document
const getCachedDocument = (id: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${DOCUMENT_CACHE_KEY}${id}`);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.error('Error reading from cache:', e);
    return null;
  }
};

// Function to cache document
const cacheDocument = (id: string, document: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${DOCUMENT_CACHE_KEY}${id}`,
      JSON.stringify(document),
    );
  } catch (e) {
    console.error('Error writing to cache:', e);
  }
};

export function DocumentOpener({ documentId }: DocumentOpenerProps) {
  const { setArtifact } = useArtifact();
  const [shouldDirectOpen, setShouldDirectOpen] = useState(false);
  const [cachedDocument, setCachedDocument] = useState<any>(null);
  const searchParams = useSearchParams();

  // Use effect to read URL parameters on client side only
  useEffect(() => {
    const directOpen = searchParams?.get('directOpen') === 'true';
    setShouldDirectOpen(directOpen);
  }, [searchParams]);

  // Load document from cache first
  useEffect(() => {
    const cached = getCachedDocument(documentId);
    if (cached) {
      console.log('Using cached document:', documentId);
      setCachedDocument(cached);

      // Open the document from cache immediately
      if (shouldDirectOpen && cached) {
        setArtifact({
          documentId: cached.id,
          kind: cached.kind,
          content: cached.content || '',
          title: cached.title,
          isVisible: true,
          status: 'idle',
          boundingBox: {
            top: window.innerHeight / 2,
            left: window.innerWidth / 2,
            width: 400,
            height: 300,
          },
        });
      }
    }
  }, [documentId, shouldDirectOpen, setArtifact]);

  // Fetch document details from server (will run in parallel)
  const { data: documents } = useSWR<Array<any>>(
    documentId ? `/api/document?id=${documentId}` : null,
    fetcher,
    {
      // Higher priority fetch for documents
      dedupingInterval: 0,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      errorRetryCount: 1,
    },
  );

  // Update cache and UI when fresh data arrives
  useEffect(() => {
    if (documents && documents.length > 0) {
      const document = documents[0];

      // Update cache with latest document
      cacheDocument(documentId, document);

      // If we didn't have a cached version or content has changed, update the UI
      if (!cachedDocument || cachedDocument.content !== document.content) {
        if (shouldDirectOpen) {
          // Update the artifact with fresh data
          setArtifact({
            documentId: document.id,
            kind: document.kind,
            content: document.content || '',
            title: document.title,
            isVisible: true,
            status: 'idle',
            boundingBox: {
              top: window.innerHeight / 2,
              left: window.innerWidth / 2,
              width: 400,
              height: 300,
            },
          });
        } else {
          // Standard behavior with delay
          const timer = setTimeout(() => {
            setArtifact({
              documentId: document.id,
              kind: document.kind,
              content: document.content || '',
              title: document.title,
              isVisible: true,
              status: 'idle',
              boundingBox: {
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
                width: 400,
                height: 300,
              },
            });
          }, 1000);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [documents, documentId, setArtifact, shouldDirectOpen, cachedDocument]);

  // This is a utility component that doesn't render anything
  return null;
}
