/**
 * TimelinePanel.tsx
 *
 * Session history sidebar tab. Shows a list of canvas snapshots and a
 * scrubber for replaying the session. Works only in Supabase (database) mode —
 * Ably (relay) is ephemeral and has no snapshot history.
 */

import { useEffect, useRef } from "react";
import { useAtomValue } from "../app-jotai";
import {
  snapshotsAtom,
  replayIndexAtom,
  isReplayingAtom,
  replayPlayingAtom,
  type Snapshot,
} from "../oneshot-jotai";
import { useReplay } from "../hooks/useReplay";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function authorColor(author: string): string {
  // Deterministic color per author. Matches the palette used in Phase 6.
  const palette: Record<string, string> = {
    human: "#f1f5f9",
    claude: "#38bdf8",
    cursor: "#fb923c",
    aider: "#4ade80",
    windsurf: "#a78bfa",
    ai: "#38bdf8",
  };
  return palette[author.toLowerCase()] ?? "#94a3b8";
}

// ── Scrubber ─────────────────────────────────────────────────────────────────

function Scrubber({
  total,
  current,
  snapshots,
  onSeek,
}: {
  total: number;
  current: number;
  snapshots: Snapshot[];
  onSeek: (i: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div style={{ padding: "0 12px 12px" }}>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={current < 0 ? total - 1 : current}
        onChange={(e) => onSeek(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#38bdf8" }}
      />
      {/* Dot strip */}
      <div
        style={{
          display: "flex",
          gap: 3,
          marginTop: 4,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {snapshots.map((s, i) => (
          <button
            key={s.id}
            title={`${s.agentLabel} · ${formatTime(s.createdAt)}`}
            onClick={() => onSeek(i)}
            style={{
              flexShrink: 0,
              width: 8,
              height: 8,
              borderRadius: "50%",
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: authorColor(s.author),
              opacity: i === current ? 1 : 0.45,
              outline: i === current ? `2px solid ${authorColor(s.author)}` : "none",
              outlineOffset: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function TimelinePanel() {
  const snapshots = useAtomValue(snapshotsAtom);
  const replayIndex = useAtomValue(replayIndexAtom);
  const isReplaying = useAtomValue(isReplayingAtom);
  const isPlaying = useAtomValue(replayPlayingAtom);
  const { loadSnapshots, seekTo, play, pause, exitReplay } = useReplay();

  const listRef = useRef<HTMLDivElement>(null);

  // Load snapshots when panel mounts
  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  // Auto-scroll list to selected row
  useEffect(() => {
    if (listRef.current && replayIndex >= 0) {
      const row = listRef.current.querySelector(
        `[data-index="${replayIndex}"]`,
      ) as HTMLElement | null;
      row?.scrollIntoView({ block: "nearest" });
    }
  }, [replayIndex]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      // If at the end or not yet started, start from beginning
      const startIndex =
        replayIndex < 0 || replayIndex >= snapshots.length - 1 ? 0 : replayIndex;
      seekTo(startIndex);
      play();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#1e293b",
        color: "#e2e8f0",
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 12px 8px",
          borderBottom: "1px solid #334155",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 600 }}>⏱ Session History</span>
        <button
          onClick={loadSnapshots}
          title="Refresh snapshots"
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: 14,
            padding: "2px 4px",
          }}
        >
          ↻
        </button>
      </div>

      {/* Live / Replay status */}
      {isReplaying ? (
        <div
          style={{
            padding: "6px 12px",
            background: "#0f172a",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #334155",
          }}
        >
          <span style={{ color: "#fb923c", fontSize: 11, fontWeight: 600 }}>
            ● REPLAY
          </span>
          <button
            onClick={exitReplay}
            style={{
              marginLeft: "auto",
              background: "#334155",
              border: "none",
              color: "#e2e8f0",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            ✕ Back to live
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: "6px 12px",
            background: "#0f172a",
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderBottom: "1px solid #334155",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#4ade80",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>LIVE</span>
        </div>
      )}

      {/* Snapshot list */}
      <div
        ref={listRef}
        style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}
      >
        {snapshots.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            No history yet.
            <br />
            Draw something on the canvas to start recording.
          </div>
        ) : (
          [...snapshots].reverse().map((snap, reversedIdx) => {
            const idx = snapshots.length - 1 - reversedIdx;
            const isSelected = idx === replayIndex;
            return (
              <button
                key={snap.id}
                data-index={idx}
                onClick={() => seekTo(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 12px",
                  border: "none",
                  borderBottom: "1px solid #1e293b",
                  background: isSelected ? "#0f172a" : "transparent",
                  color: isSelected ? "#e2e8f0" : "#94a3b8",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: authorColor(snap.author),
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 12 }}>{snap.agentLabel}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {formatTime(snap.createdAt)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Playback controls + scrubber */}
      {snapshots.length > 0 && (
        <>
          <div
            style={{
              padding: "8px 12px 0",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderTop: "1px solid #334155",
            }}
          >
            <button
              onClick={() => seekTo(Math.max(0, replayIndex - 1))}
              disabled={replayIndex <= 0}
              title="Previous"
              style={controlBtnStyle}
            >
              ◀
            </button>
            <button onClick={handlePlayPause} title={isPlaying ? "Pause" : "Play"} style={controlBtnStyle}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => seekTo(Math.min(snapshots.length - 1, replayIndex + 1))}
              disabled={replayIndex >= snapshots.length - 1}
              title="Next"
              style={controlBtnStyle}
            >
              ▶
            </button>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "#64748b",
              }}
            >
              {replayIndex >= 0 ? `${replayIndex + 1} / ${snapshots.length}` : `${snapshots.length} frames`}
            </span>
          </div>
          <Scrubber
            total={snapshots.length}
            current={replayIndex}
            snapshots={snapshots}
            onSeek={seekTo}
          />
        </>
      )}
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  background: "#334155",
  border: "none",
  color: "#e2e8f0",
  borderRadius: 4,
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: 12,
};
