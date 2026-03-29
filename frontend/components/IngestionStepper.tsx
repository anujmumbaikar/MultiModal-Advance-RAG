import { Check, Loader2, Circle, XCircle } from 'lucide-react';
import { IngestionJob } from '@/types';
import { cn } from '@/lib/utils';

const stageLabels: Record<string, string> = {
  upload_received: 'Upload Received',
  chunking: 'Extracting & Chunking',
  embeddings: 'Generating Embeddings',
  vector_storage: 'Vector Storage',
  ready: 'Ready for Query',
};

export function IngestionStepper({ job }: { job: IngestionJob }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Pipeline Progress</h4>
        <span className="text-sm text-muted-foreground">{job.progress}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${job.progress}%` }}
        />
      </div>
      <div className="space-y-1">
        {job.stages.map((stage) => (
          <div key={stage.stage} className="flex items-center gap-3 py-1.5">
            <div
              className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center shrink-0',
                stage.status === 'completed' && 'bg-green-500 text-white',
                stage.status === 'running' && 'bg-primary text-primary-foreground',
                stage.status === 'failed' && 'bg-destructive text-destructive-foreground',
                stage.status === 'pending' && 'bg-muted text-muted-foreground',
              )}
            >
              {stage.status === 'completed' && <Check className="h-3.5 w-3.5" />}
              {stage.status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {stage.status === 'pending' && <Circle className="h-3 w-3" />}
              {stage.status === 'failed' && <XCircle className="h-3.5 w-3.5" />}
            </div>
            <span
              className={cn(
                'text-sm',
                stage.status === 'running' && 'font-medium',
                stage.status === 'pending' && 'text-muted-foreground',
                stage.status === 'failed' && 'text-destructive',
              )}
            >
              {stageLabels[stage.stage] ?? stage.stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IngestionLogs({ logs }: { logs: IngestionJob['logs'] }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-3 border-b bg-muted/30">
        <h4 className="text-sm font-medium">Activity Log</h4>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 space-y-1 font-mono text-xs">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span
              className={cn(
                log.level === 'error' && 'text-destructive',
                log.level === 'warn' && 'text-yellow-500',
              )}
            >
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
