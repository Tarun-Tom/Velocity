import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { X, Copy, Check, Users, Radio, Shield, Link2 } from 'lucide-react';

export interface PlayerPresence {
  callsign: string;
  isHost: boolean;
  joinedAt: number;
  status: string;
}

export interface MultiplayerLaunchPayload {
  seed: number;
  hostCallsign: string;
  roomCode: string;
  channel: RealtimeChannel;
  callsign: string;
  players: PlayerPresence[];
}

interface MultiplayerLobbyProps {
  theme: 'light' | 'dark';
  onClose: () => void;
  onLaunchGame?: (payload: MultiplayerLaunchPayload) => void;
  initialRoomCode?: string;
  initialCallsign?: string;
  existingChannel?: RealtimeChannel | null;
  existingPlayers?: PlayerPresence[];
  isHostUser?: boolean;
}

// ── Telemetry Corner Markers ───────────────────────────────────────────────────
const TechnicalCorners: React.FC<{ color: string }> = ({ color }) => (
  <>
    <span aria-hidden="true" style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, lineHeight: 1, color, opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>+</span>
    <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 11, lineHeight: 1, color, opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>+</span>
    <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11, lineHeight: 1, color, opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>+</span>
    <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, lineHeight: 1, color, opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>+</span>
  </>
);

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  theme,
  onClose,
  onLaunchGame,
  initialRoomCode,
  initialCallsign,
  existingChannel,
  existingPlayers,
  isHostUser,
}) => {
  const isLight = theme === 'light';
  const goldColor = isLight ? '#9A762E' : '#C5A059';
  const textColor = isLight ? '#1E1C19' : '#FDFDFB';
  const subtextColor = isLight ? '#5C5750' : 'rgba(253, 253, 251, 0.60)';
  const bgColor = isLight ? '#FAF7F2' : '#000000';
  const inputBg = isLight ? 'rgba(30, 28, 25, 0.04)' : 'rgba(253, 253, 251, 0.04)';
  const borderIdle = isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.25)';

  // ── Callsign State (Max 10 Chars, Saved to LocalStorage) ─────────────
  const [callsign, setCallsign] = useState<string>(() => {
    if (initialCallsign && initialCallsign.trim()) {
      return initialCallsign.trim().slice(0, 10);
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('velocity_callsign');
      if (saved && saved.trim()) return saved.trim().slice(0, 10);
    }
    const defaultTag = `Player_${Math.floor(10 + Math.random() * 90)}`;
    return defaultTag;
  });

  const handleCallsignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^A-Za-z0-9_ -]/g, '').slice(0, 10);
    setCallsign(sanitized);
    if (typeof window !== 'undefined') {
      localStorage.setItem('velocity_callsign', sanitized);
    }
  };

  // ── Room & Realtime Presence State ─────────────────────────────────────────
  const [roomCode, setRoomCode] = useState<string>(() => (initialRoomCode ? initialRoomCode.trim().toUpperCase() : ''));
  const [inputRoomCode, setInputRoomCode] = useState<string>(() => (initialRoomCode ? initialRoomCode.trim().toUpperCase() : ''));
  const [isHost, setIsHost] = useState<boolean>(isHostUser || false);
  const [isConnected, setIsConnected] = useState<boolean>(Boolean(existingChannel && initialRoomCode));
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerPresence[]>(existingPlayers || []);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const callsignInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(existingChannel || null);
  const isHandingOverRef = useRef<boolean>(false);
  const currentPlayersRef = useRef<PlayerPresence[]>(existingPlayers || []);

  const hasInviteCode = Boolean(initialRoomCode && !isConnected && !existingChannel);

  // Safe presence extraction helper with defensive fallback
  const parsePresenceRoster = useCallback((presenceState: any): PlayerPresence[] => {
    if (!presenceState) return [];
    try {
      const activePlayers: any[] = presenceState ? Object.values(presenceState).flat() : [];
      const roster: PlayerPresence[] = [];
      const seen = new Set<string>();

      activePlayers.forEach((p) => {
        if (!p || typeof p !== 'object') return;
        const tag = (p.callsign || '').trim();
        if (!tag || seen.has(tag)) return;
        seen.add(tag);
        roster.push({
          callsign: tag,
          isHost: Boolean(p.isHost),
          joinedAt: typeof p.joinedAt === 'number' ? p.joinedAt : Date.now(),
          status: p.status || 'Ready',
        });
      });
      roster.sort((a, b) => a.joinedAt - b.joinedAt);
      return roster;
    } catch (err) {
      console.error('[PRESENCE SYNC ERROR]', err);
      return [];
    }
  }, []);

  const safePlayers = Array.isArray(players) ? players : [];

  // Exit lobby and disconnect channel explicitly
  const handleExitLobby = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsHost(false);
    setRoomCode('');
    setPlayers([]);
    currentPlayersRef.current = [];
    onClose();
  }, [onClose]);

  // Clean disconnect helper (reverts connection state without closing modal)
  const disconnectChannel = useCallback(() => {
    if (channelRef.current && !existingChannel) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsHost(false);
    setRoomCode('');
    setPlayers([]);
    currentPlayersRef.current = [];
  }, [existingChannel]);

  // Listen for Escape key to exit modal safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExitLobby();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExitLobby]);

  // Cleanup channel on unmount only if not handing over to gameplay and not existing channel
  useEffect(() => {
    return () => {
      if (!isHandingOverRef.current && !existingChannel) {
        disconnectChannel();
      }
    };
  }, [disconnectChannel, existingChannel]);

  // ── If existingChannel passed from App.tsx, attach presence and sync listeners ──
  useEffect(() => {
    if (!existingChannel) return;

    channelRef.current = existingChannel;
    setIsConnected(true);
    setIsConnecting(false);
    if (initialRoomCode) setRoomCode(initialRoomCode);
    if (isHostUser !== undefined) setIsHost(isHostUser);

    const safePresence = () => {
      try {
        return typeof existingChannel.presenceState === 'function' ? existingChannel.presenceState() : {};
      } catch (err) {
        console.warn('[LOBBY PRESENCE CHECK WARN]', err);
        return {};
      }
    };

    // Synchronize presence roster from current channel presence state
    const syncRoster = () => {
      const roster = parsePresenceRoster(safePresence());
      if (roster.length > 0) {
        setPlayers(roster);
        currentPlayersRef.current = roster;
      } else if (existingPlayers && existingPlayers.length > 0) {
        setPlayers(existingPlayers);
        currentPlayersRef.current = existingPlayers;
      }
    };

    // Initial safe sync from existing channel presence
    syncRoster();

    // Re-affirm local presence state if needed
    try {
      if (callsign) {
        existingChannel.track({
          callsign,
          isHost: isHostUser ?? false,
          joinedAt: Date.now(),
          status: 'Ready',
        }).catch?.(() => {});
      }
    } catch {
      // Safe guard against untracked channel
    }

    // Periodically poll channel's in-memory presence state (no new presence callback added, preventing Supabase after-subscribe crash)
    const syncInterval = setInterval(syncRoster, 500);

    // Broadcast: Listen for next GAME_START on existing channel safely (broadcast is allowed after subscribe)
    const handleGameStart = ({ payload }: { payload: any }) => {
      if (payload && payload.seed !== undefined && onLaunchGame && channelRef.current) {
        isHandingOverRef.current = true;
        onLaunchGame({
          seed: payload.seed,
          hostCallsign: payload.hostCallsign,
          roomCode: initialRoomCode || roomCode,
          channel: channelRef.current,
          callsign,
          players: currentPlayersRef.current.length > 0 ? currentPlayersRef.current : [{ callsign, isHost: Boolean(isHostUser), joinedAt: Date.now(), status: 'Ready' }],
        });
      }
    };

    try {
      existingChannel.on('broadcast', { event: 'GAME_START' }, handleGameStart);
    } catch (err) {
      console.warn('[LOBBY GAME_START BINDING WARN]', err);
    }

    return () => {
      clearInterval(syncInterval);
    };
  }, [existingChannel, initialRoomCode, isHostUser, existingPlayers, parsePresenceRoster, onLaunchGame, callsign, roomCode]);

  // ── Realtime Room Connection Logic ─────────────────────────────────────────
  const connectToRoom = useCallback((targetCode: string, hosting: boolean) => {
    const effectiveTag = callsign.trim() || `Player_${Math.floor(10 + Math.random() * 90)}`;
    const formattedCode = targetCode.trim().toUpperCase();

    if (!formattedCode) {
      setConnectionError('Please enter a room code');
      return;
    }

    setConnectionError(null);
    setIsConnecting(true);

    const channelName = `room:${formattedCode}`;

    // Purge any stale or duplicate channels with this topic from Supabase client registry
    try {
      const activeChannels = supabase.getChannels();
      activeChannels.forEach((ch) => {
        if (ch.topic === `realtime:${channelName}` || ch === channelRef.current) {
          ch.unsubscribe();
          supabase.removeChannel(ch);
        }
      });
    } catch (cleanErr) {
      console.warn('[CHANNEL_PURGE_WARN]', cleanErr);
    }
    channelRef.current = null;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: effectiveTag,
        },
      },
    });

    channelRef.current = channel;

    // Presence: Synchronize players
    channel
      .on('presence', { event: 'sync' }, () => {
        const roster = parsePresenceRoster(channel.presenceState());
        setPlayers(roster);
        currentPlayersRef.current = roster;
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[ROOM PRESENCE: JOIN]', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[ROOM PRESENCE: LEAVE]', key, leftPresences);
      })
      // Broadcast: Game start listener
      .on('broadcast', { event: 'GAME_START' }, ({ payload }) => {
        console.log('[ROOM BROADCAST: GAME_START]', payload);
        if (onLaunchGame && channelRef.current) {
          isHandingOverRef.current = true;
          const activeRoster = (payload && Array.isArray(payload.players) && payload.players.length > 0)
            ? payload.players
            : (currentPlayersRef.current.length > 0 ? currentPlayersRef.current : [{ callsign: effectiveTag, isHost: hosting, joinedAt: Date.now(), status: 'Ready' }]);
          onLaunchGame({
            seed: payload.seed,
            hostCallsign: payload.hostCallsign,
            roomCode: formattedCode,
            channel: channelRef.current,
            callsign: effectiveTag,
            players: activeRoster,
          });
        }
      });

    let retryAttempts = 0;

    const executeSubscription = () => {
      channel.subscribe(async (status) => {
        console.log('[REALTIME_SUBSCRIBE_STATUS]', status);
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              callsign: effectiveTag,
              isHost: hosting,
              joinedAt: Date.now(),
              status: 'Ready',
            });
          } catch (trackErr) {
            console.warn('[PRESENCE_TRACK_WARN]', trackErr);
          }
          setIsConnected(true);
          setIsConnecting(false);
          setIsHost(hosting);
          setRoomCode(formattedCode);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnecting(false);
          setConnectionError('Could not connect to room. Please try again.');
        } else if (status === 'TIMED_OUT') {
          if (retryAttempts < 1) {
            retryAttempts++;
            console.log('[REALTIME_SOCKET_RETRYING...]');
            setTimeout(() => {
              if (channelRef.current) {
                executeSubscription();
              }
            }, 800);
          } else {
            setIsConnecting(false);
            setConnectionError('Connection timed out. Please click Retry.');
          }
        }
      }, 20000);
    };

    executeSubscription();
  }, [callsign, onLaunchGame, parsePresenceRoster]);

  // ── Auto-Join Setup for Invited Friends ───────────────────────────────────
  useEffect(() => {
    if (initialRoomCode && !existingChannel && !isConnected) {
      const sanitized = initialRoomCode.trim().toUpperCase();
      setInputRoomCode(sanitized);

      // Focus the player's attention on their [ OPERATOR_TAG ] so they can confirm/type their name
      const timer = setTimeout(() => {
        if (callsignInputRef.current) {
          callsignInputRef.current.focus();
          callsignInputRef.current.select();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialRoomCode, existingChannel, isConnected]);

  // ── Host Room Flow ─────────────────────────────────────────────────────────
  const handleHostRoom = () => {
    // Generate 6-character room code (e.g. VELO-42)
    const randomDigits = Math.floor(10 + Math.random() * 90);
    const code = `VELO-${randomDigits}`;
    connectToRoom(code, true);
  };

  // ── Join Room Flow ─────────────────────────────────────────────────────────
  const handleJoinRoom = () => {
    if (!inputRoomCode.trim()) {
      setConnectionError('ENTER VALID 6-CHAR CODE');
      return;
    }
    connectToRoom(inputRoomCode, false);
  };

  // ── Host Launch Protocol ───────────────────────────────────────────────────
  const handleLaunchVector = () => {
    if (!channelRef.current || !isHost) return;

    const seed = Math.random();
    channelRef.current.send({
      type: 'broadcast',
      event: 'GAME_START',
      payload: {
        seed,
        hostCallsign: callsign,
        roomCode,
        players: currentPlayersRef.current,
      },
    });

    if (onLaunchGame) {
      isHandingOverRef.current = true;
      onLaunchGame({
        seed,
        hostCallsign: callsign,
        roomCode,
        channel: channelRef.current,
        callsign,
        players: currentPlayersRef.current.length > 0 ? currentPlayersRef.current : [{ callsign, isHost: true, joinedAt: Date.now(), status: 'Ready' }],
      });
    }
  };

  // ── Robust Multi-Tier Clipboard Copy ───────────────────────────────────────
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    // Tier 1: Modern Async Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('[CLIPBOARD_API_FAILED]', err);
      }
    }

    // Tier 2: Hidden textarea execCommand fallback
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) return true;
    } catch (err) {
      console.warn('[EXECCOMMAND_COPY_FAILED]', err);
    }

    // Tier 3: Interactive Prompt fallback
    try {
      window.prompt('Copy invite link to clipboard: (Ctrl+C, Enter)', text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleCopyCode = async () => {
    if (roomCode) {
      await copyToClipboard(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!roomCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
    const inviteUrl = `${origin}${pathname}/?room=${encodeURIComponent(roomCode)}`;

    await copyToClipboard(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLight ? 'rgba(250, 247, 242, 0.82)' : 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: "'JetBrains Mono', monospace",
        pointerEvents: 'auto',
      }}
    >
      {/* Central Technical Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{
          width: '100%',
          maxWidth: '680px',
          background: bgColor,
          border: `1px solid ${goldColor}`,
          borderRadius: 0,
          padding: '36px 40px',
          position: 'relative',
          boxSizing: 'border-box',
          boxShadow: isLight
            ? '0 12px 48px rgba(154, 118, 46, 0.15)'
            : '0 16px 56px rgba(197, 160, 89, 0.18)',
        }}
      >
        <TechnicalCorners color={goldColor} />

        {/* Modal Top Strip: Protocol Tag & Exit Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
            borderBottom: `1px solid ${borderIdle}`,
            paddingBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={14} color={goldColor} style={{ animation: 'pulse 2s infinite' }} />
            <span
              style={{
                fontSize: '11px',
                letterSpacing: '0.22em',
                color: goldColor,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              MULTIPLAYER ROOM
            </span>
            {!isSupabaseConfigured && (
              <span
                style={{
                  fontSize: '9px',
                  background: 'rgba(217, 83, 79, 0.15)',
                  color: '#D9534F',
                  border: '1px solid rgba(217, 83, 79, 0.4)',
                  padding: '2px 6px',
                  letterSpacing: '0.1em',
                }}
              >
                OFFLINE_MODE
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExitLobby}
            style={{
              background: 'transparent',
              border: `1px solid ${borderIdle}`,
              color: goldColor,
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.14em',
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: 0,
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = goldColor;
              e.currentTarget.style.backgroundColor = isLight ? 'rgba(154, 118, 46, 0.1)' : 'rgba(197, 160, 89, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = borderIdle;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={12} />
            [ LEAVE ROOM ]
          </button>
        </div>

        {/* 1. Name Input Bar at the Top */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              letterSpacing: '0.2em',
              color: subtextColor,
              textTransform: 'uppercase',
            }}
          >
            <span>PLAYER NAME (SAVED AUTOMATICALLY)</span>
            {hasInviteCode && (
              <span
                style={{
                  color: goldColor,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                INVITE ACTIVE · ENTER YOUR NAME
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${hasInviteCode ? goldColor : borderIdle}`,
              background: inputBg,
              padding: '12px 16px',
              boxSizing: 'border-box',
              boxShadow: hasInviteCode
                ? `0 0 16px ${isLight ? 'rgba(154, 118, 46, 0.2)' : 'rgba(197, 160, 89, 0.25)'}`
                : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ color: goldColor, fontWeight: 700, fontSize: '13px', letterSpacing: '0.15em', marginRight: '10px' }}>
              Your Name:
            </span>
            <input
              ref={callsignInputRef}
              type="text"
              value={callsign}
              onChange={handleCallsignChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputRoomCode.trim() && !isConnected && !isConnecting) {
                  handleJoinRoom();
                }
              }}
              disabled={isConnected || isConnecting}
              maxLength={10}
              placeholder="e.g. Alex"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: textColor,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
            />
          </div>
        </div>

        {/* Error message banner */}
        {connectionError && (
          <div
            style={{
              fontSize: '11px',
              color: '#D9534F',
              border: '1px solid rgba(217, 83, 79, 0.4)',
              background: 'rgba(217, 83, 79, 0.08)',
              padding: '10px 14px',
              marginBottom: '24px',
              letterSpacing: '0.12em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span>[!] {connectionError}</span>
            {inputRoomCode.trim() && (
              <button
                type="button"
                onClick={() => connectToRoom(inputRoomCode, isHost)}
                style={{
                  background: 'rgba(217, 83, 79, 0.15)',
                  border: '1px solid #D9534F',
                  color: textColor,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  borderRadius: 0,
                  outline: 'none',
                }}
              >
                [ RETRY ]
              </button>
            )}
          </div>
        )}

        {/* 2. Room State Controller */}
        {!isConnected ? (
          /* UNCONNECTED: Choice between Hosting and Joining */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
              marginTop: '8px',
            }}
          >
            {/* Host Section */}
            <div
              style={{
                border: `1px solid ${borderIdle}`,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: isLight ? 'rgba(30, 28, 25, 0.02)' : 'rgba(253, 253, 251, 0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: goldColor, fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', marginBottom: '8px' }}>
                  <Shield size={13} />
                  01 · CREATE ROOM
                </div>
                <div style={{ fontSize: '11px', color: subtextColor, lineHeight: 1.5, marginBottom: '20px' }}>
                  Generate a 6-character room code and invite friends. You control when the game starts.
                </div>
              </div>

              <motion.button
                type="button"
                onClick={handleHostRoom}
                disabled={isConnecting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: goldColor,
                  color: isLight ? '#FAF7F2' : '#000000',
                  border: `1px solid ${goldColor}`,
                  borderRadius: 0,
                  padding: '12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  cursor: isConnecting ? 'wait' : 'pointer',
                  outline: 'none',
                  opacity: isConnecting ? 0.6 : 1,
                  boxShadow: `0 0 16px ${isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.35)'}`,
                }}
              >
                {isConnecting ? 'CREATING ROOM...' : '[ CREATE ROOM ]'}
              </motion.button>
            </div>

            {/* Join Section */}
            <div
              style={{
                border: `1px solid ${hasInviteCode ? goldColor : borderIdle}`,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: hasInviteCode
                  ? (isLight ? 'rgba(154, 118, 46, 0.04)' : 'rgba(197, 160, 89, 0.05)')
                  : (isLight ? 'rgba(30, 28, 25, 0.02)' : 'rgba(253, 253, 251, 0.02)'),
                boxShadow: hasInviteCode
                  ? `0 0 20px ${isLight ? 'rgba(154, 118, 46, 0.15)' : 'rgba(197, 160, 89, 0.2)'}`
                  : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: goldColor, fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em' }}>
                    <Users size={13} />
                    02 · JOIN ROOM
                  </div>
                  {hasInviteCode && (
                    <span style={{ fontSize: '10px', color: goldColor, fontWeight: 700, letterSpacing: '0.14em' }}>
                      [ ROOM INVITE DETECTED ]
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: subtextColor, lineHeight: 1.5, marginBottom: '14px' }}>
                  {hasInviteCode
                    ? `Join your friends in room [ ${inputRoomCode} ] to race together.`
                    : 'Enter the room code shared by your friend to join the match.'}
                </div>

                <input
                  type="text"
                  placeholder="ENTER ROOM CODE (e.g. VELO-42)"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputRoomCode.trim() && !isConnecting) {
                      handleJoinRoom();
                    }
                  }}
                  disabled={isConnecting}
                  maxLength={10}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: inputBg,
                    border: `1px solid ${hasInviteCode ? goldColor : borderIdle}`,
                    padding: '8px 12px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: textColor,
                    outline: 'none',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              <motion.button
                type="button"
                onClick={handleJoinRoom}
                disabled={isConnecting || !inputRoomCode.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: hasInviteCode ? goldColor : 'transparent',
                  color: hasInviteCode ? (isLight ? '#FAF7F2' : '#000000') : goldColor,
                  border: `1px solid ${goldColor}`,
                  borderRadius: 0,
                  padding: '12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  cursor: isConnecting ? 'wait' : 'pointer',
                  outline: 'none',
                  opacity: !inputRoomCode.trim() || isConnecting ? 0.5 : 1,
                  boxShadow: hasInviteCode
                    ? `0 0 20px ${isLight ? 'rgba(154, 118, 46, 0.35)' : 'rgba(197, 160, 89, 0.45)'}`
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isConnecting ? 'JOINING ROOM...' : hasInviteCode ? `[ JOIN · ${inputRoomCode} ]` : '[ JOIN ROOM ]'}
              </motion.button>
            </div>
          </div>
        ) : (
          /* CONNECTED: Room Telemetry, Presence Roster, and Launch Vector */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Room Vector Status Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 18px',
                border: `1px solid ${goldColor}`,
                background: isLight ? 'rgba(154, 118, 46, 0.08)' : 'rgba(197, 160, 89, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: subtextColor, letterSpacing: '0.15em' }}>
                  ROOM CODE:
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.22em', color: goldColor }}>
                  {roomCode}
                </span>

                {/* Direct Code Copy */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy room code only"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${borderIdle}`,
                    color: textColor,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '3px 8px',
                    borderRadius: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = goldColor;
                    e.currentTarget.style.color = goldColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = borderIdle;
                    e.currentTarget.style.color = textColor;
                  }}
                >
                  {copied ? <Check size={11} color="#5CB85C" /> : <Copy size={11} />}
                  <span>{copied ? 'COPIED' : 'COPY CODE'}</span>
                </button>

                {/* 2. One-Click Copy Dedicated Invite Action Button */}
                <motion.button
                  type="button"
                  onClick={handleCopyInviteLink}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: copiedLink
                      ? (isLight ? 'rgba(154, 118, 46, 0.22)' : 'rgba(197, 160, 89, 0.28)')
                      : (isLight ? 'rgba(154, 118, 46, 0.06)' : 'rgba(197, 160, 89, 0.08)'),
                    color: goldColor,
                    border: `1px solid ${goldColor}`,
                    borderRadius: 0,
                    padding: '4px 10px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: copiedLink
                      ? `0 0 14px ${isLight ? 'rgba(154, 118, 46, 0.45)' : 'rgba(197, 160, 89, 0.55)'}`
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isLight ? 'rgba(154, 118, 46, 0.14)' : 'rgba(197, 160, 89, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    if (!copiedLink) {
                      e.currentTarget.style.backgroundColor = isLight ? 'rgba(154, 118, 46, 0.06)' : 'rgba(197, 160, 89, 0.08)';
                    }
                  }}
                >
                  {copiedLink ? <Check size={12} color={goldColor} /> : <Link2 size={12} color={goldColor} />}
                  <span>{copiedLink ? '[ COPIED TO CLIPBOARD ]' : '[ COPY INVITE LINK ]'}</span>
                </motion.button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.16em',
                    padding: '3px 8px',
                    border: `1px solid ${goldColor}`,
                    background: isHost ? goldColor : 'transparent',
                    color: isHost ? (isLight ? '#FAF7F2' : '#000000') : goldColor,
                    fontWeight: 700,
                  }}
                >
                  {isHost ? 'HOST' : 'PLAYER'}
                </span>
              </div>
            </div>

            {/* Presence Roster & Occupancy Slots */}
            <div
              style={{
                border: `1px solid ${borderIdle}`,
                padding: '20px',
                background: isLight ? 'rgba(30, 28, 25, 0.02)' : 'rgba(253, 253, 251, 0.02)',
              }}
            >
              {/* Roster Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${borderIdle}`,
                  paddingBottom: '12px',
                  marginBottom: '16px',
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                }}
              >
                <span style={{ color: goldColor, fontWeight: 700 }}>
                  PLAYERS IN ROOM
                </span>
                <span style={{ color: textColor }}>
                  [ {safePlayers.length} / 8 ]
                </span>
              </div>

              {/* Roster Slots List or Loading Indicator */}
              {isConnected && safePlayers.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    border: `1px dashed ${goldColor}`,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: goldColor,
                    fontSize: '11px',
                    letterSpacing: '0.18em',
                    background: isLight ? 'rgba(154, 118, 46, 0.04)' : 'rgba(197, 160, 89, 0.04)',
                  }}
                >
                  <Radio size={14} className="animate-spin" />
                  <span>[ JOINING ROOM... ]</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from({ length: 8 }).map((_, index) => {
                    const player = safePlayers[index];
                    if (player) {
                      const isSelf = player.callsign === callsign;
                      return (
                        <div
                          key={player.callsign}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            border: `1px solid ${isSelf ? goldColor : borderIdle}`,
                            background: isSelf
                              ? isLight ? 'rgba(154, 118, 46, 0.06)' : 'rgba(197, 160, 89, 0.06)'
                              : 'transparent',
                            fontSize: '12px',
                            letterSpacing: '0.14em',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: goldColor }}>•</span>
                            <span style={{ fontWeight: 700, color: textColor }}>
                              {player.callsign}
                            </span>
                            {player.isHost && (
                              <span style={{ fontSize: '10px', color: goldColor, opacity: 0.85 }}>
                                (HOST)
                              </span>
                            )}
                            {isSelf && (
                              <span style={{ fontSize: '9px', background: isLight ? 'rgba(154, 118, 46, 0.2)' : 'rgba(197, 160, 89, 0.2)', color: goldColor, padding: '1px 5px' }}>
                                YOU
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: subtextColor, opacity: 0.5 }}>──</span>
                            <span style={{ fontSize: '10px', color: '#5CB85C', fontWeight: 600 }}>
                              Ready
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Empty Slot
                    return (
                      <div
                        key={`empty-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 12px',
                          border: '1px dashed rgba(197, 160, 89, 0.12)',
                          fontSize: '11px',
                          letterSpacing: '0.14em',
                          opacity: 0.35,
                          color: subtextColor,
                        }}
                      >
                        <span>• ----------------</span>
                        <span>Slot Available</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Launch & Control Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
              }}
            >
              <button
                type="button"
                onClick={handleExitLobby}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderIdle}`,
                  color: subtextColor,
                  fontSize: '11px',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.14em',
                  padding: '12px 18px',
                  cursor: 'pointer',
                  borderRadius: 0,
                  outline: 'none',
                }}
              >
                [ LEAVE ROOM ]
              </button>

              {isHost ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <motion.button
                    type="button"
                    onClick={handleLaunchVector}
                    disabled={safePlayers.length < 2}
                    whileHover={safePlayers.length >= 2 ? { scale: 1.02 } : {}}
                    whileTap={safePlayers.length >= 2 ? { scale: 0.98 } : {}}
                    style={{
                      background: safePlayers.length >= 2 ? goldColor : 'transparent',
                      color: safePlayers.length >= 2 ? (isLight ? '#FAF7F2' : '#000000') : subtextColor,
                      border: `1px solid ${safePlayers.length >= 2 ? goldColor : borderIdle}`,
                      borderRadius: 0,
                      padding: '14px 28px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 800,
                      letterSpacing: '0.22em',
                      cursor: safePlayers.length >= 2 ? 'pointer' : 'not-allowed',
                      outline: 'none',
                      boxShadow: safePlayers.length >= 2
                        ? `0 0 20px ${isLight ? 'rgba(154, 118, 46, 0.35)' : 'rgba(197, 160, 89, 0.45)'}`
                        : 'none',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    [ START GAME ]
                  </motion.button>
                  {safePlayers.length < 2 && (
                    <span style={{ fontSize: '10px', color: subtextColor, letterSpacing: '0.1em' }}>
                      Waiting for at least 2 players
                    </span>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    color: goldColor,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: goldColor, animation: 'pulse 1.5s infinite' }} />
                  <span>Waiting for host to start...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
