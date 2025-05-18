import { Artifact } from '@/components/create-artifact';
import { CodeEditor } from '@/components/code-editor';
import {
  CopyIcon,
  LogsIcon,
  MessageIcon,
  PlayIcon,
  RedoIcon,
  SaveIcon,
  UndoIcon,
} from '@/components/icons';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';
import { Console } from '@/components/console';
import type { ConsoleOutput, ConsoleOutputContent } from '@/components/console';

const OUTPUT_HANDLERS = {
  matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
                plt.gcf().set_dpi(100)

            png_buf = io.BytesIO()
            plt.savefig(png_buf, format='png')
            png_buf.seek(0)
            png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
            print(f'data:image/png;base64,{png_base64}')
            png_buf.close()

            plt.clf()
            plt.close('all')

        plt.show = custom_show
  `,
  basic: `
    # Basic output capture setup
  `,
};

function detectRequiredHandlers(code: string): string[] {
  const handlers: string[] = ['basic'];

  if (code.includes('matplotlib') || code.includes('plt.')) {
    handlers.push('matplotlib');
  }

  return handlers;
}

interface Metadata {
  outputs: Array<ConsoleOutput>;
}

// Add language detection helper
function detectLanguage(code: string): 'python' | 'html' | 'jsx' | 'unknown' {
  // Simple detection based on code content
  if (code.includes('import React') || code.includes('export default')) {
    return 'jsx';
  }
  if (code.includes('<!DOCTYPE html') || code.includes('<html')) {
    return 'html';
  }
  if (code.includes('import matplotlib') || code.includes('def ')) {
    return 'python';
  }
  return 'unknown';
}

export const codeArtifact = new Artifact<'code', Metadata>({
  kind: 'code',
  description:
    'Useful for code generation; Code execution is only available for python code.',
  initialize: async ({ setMetadata }) => {
    setMetadata({
      outputs: [],
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'code-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }
  },
  content: ({ metadata, setMetadata, ...props }) => {
    const language = detectLanguage(props.content);

    return (
      <>
        <div className="px-1">
          <CodeEditor {...props} />
        </div>

        {language === 'html' && (
          <div className="mt-4 border rounded-lg">
            <iframe
              srcDoc={props.content}
              className="w-full h-[400px]"
              title="HTML Preview"
            />
          </div>
        )}

        {language === 'jsx' && (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="text-sm text-gray-500">
              Preview not available - JSX/Next.js code requires a build
              environment
            </div>
          </div>
        )}

        {metadata?.outputs && (
          <Console
            consoleOutputs={metadata.outputs}
            setConsoleOutputs={() => {
              setMetadata({
                ...metadata,
                outputs: [],
              });
            }}
          />
        )}
      </>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: 'Run',
      description: 'Execute code',
      onClick: async ({ content, setMetadata }) => {
        const language = detectLanguage(content);

        if (language === 'html') {
          // For HTML, we just update the iframe
          return;
        }

        if (language === 'jsx') {
          toast.error('JSX/Next.js code cannot be executed in the browser');
          return;
        }

        const runId = generateUUID();
        const outputContent: Array<ConsoleOutputContent> = [];

        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs,
            {
              id: runId,
              contents: [],
              status: 'in_progress',
            },
          ],
        }));

        try {
          // @ts-expect-error - loadPyodide is not defined
          const currentPyodideInstance = await globalThis.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
          });

          currentPyodideInstance.setStdout({
            batched: (output: string) => {
              outputContent.push({
                type: output.startsWith('data:image/png;base64')
                  ? 'image'
                  : 'text',
                value: output,
              });
            },
          });

          await currentPyodideInstance.loadPackagesFromImports(content, {
            messageCallback: (message: string) => {
              setMetadata((metadata) => ({
                ...metadata,
                outputs: [
                  ...metadata.outputs.filter((output) => output.id !== runId),
                  {
                    id: runId,
                    contents: [{ type: 'text', value: message }],
                    status: 'loading_packages',
                  },
                ],
              }));
            },
          });

          const requiredHandlers = detectRequiredHandlers(content);
          for (const handler of requiredHandlers) {
            if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
              await currentPyodideInstance.runPythonAsync(
                OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
              );

              if (handler === 'matplotlib') {
                await currentPyodideInstance.runPythonAsync(
                  'setup_matplotlib_output()',
                );
              }
            }
          }

          await currentPyodideInstance.runPythonAsync(content);

          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: outputContent,
                status: 'completed',
              },
            ],
          }));
        } catch (error: any) {
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: [{ type: 'text', value: error.message }],
                status: 'failed',
              },
            ],
          }));
        }
      },
    },
    {
      icon: <SaveIcon size={18} />,
      description: 'Save to memory',
      onClick: async ({ content }) => {
        try {
          const response = await fetch('/api/memory/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content,
              type: 'document',
              metadata: {
                kind: 'code',
                language: detectLanguage(content),
              },
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save to memory');
          }

          // Use DOM to find and update the save button's icon
          const saveButtons = document.querySelectorAll(
            '[data-tooltip-content="Save to memory"]',
          );
          saveButtons.forEach((btn) => {
            // Find the SaveIcon within this button
            const svgElement = btn.querySelector('svg');
            if (svgElement) {
              // Update a data attribute that can be used in CSS to show filled state
              svgElement.setAttribute('data-saved', 'true');
              // Try to find the path element to directly update fill
              const pathElement = svgElement.querySelector('path');
              if (pathElement) {
                const gradientId =
                  svgElement.querySelector('linearGradient')?.id;
                if (gradientId) {
                  pathElement.setAttribute('fill', `url(#${gradientId})`);
                }
              }
            }

            // Update tooltip content
            const tooltipContent = btn
              .closest('[role="tooltip"]')
              ?.querySelector('[data-tooltip-content="Save to memory"]');
            if (tooltipContent) {
              tooltipContent.setAttribute(
                'data-tooltip-content',
                'Already saved to memory',
              );
            }

            // Find parent TooltipProvider and update content
            const tooltipTrigger = btn.closest('[role="button"]');
            if (tooltipTrigger) {
              const tooltipPopup = tooltipTrigger.nextElementSibling;
              if (
                tooltipPopup &&
                tooltipPopup.textContent === 'Save to memory'
              ) {
                tooltipPopup.textContent = 'Already saved to memory';
              }
            }
          });

          toast.success('Saved to memory!');
        } catch (error) {
          console.error('Error saving to memory:', error);
          toast.error('Failed to save to memory');
        }
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy code to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: 'Add comments',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Add comments to the code snippet for understanding',
        });
      },
    },
    {
      icon: <LogsIcon />,
      description: 'Add logs',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Add logs to the code snippet for debugging',
        });
      },
    },
  ],
});
