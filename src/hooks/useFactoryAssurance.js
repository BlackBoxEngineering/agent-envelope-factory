import { useCallback, useEffect, useState } from "react";
import { contentHash, hexToBytes, seedAddress } from "agent-envelope-sdk";
import { checkpointFor, createEventRecorder, verifyEventJournal } from "agent-envelope-assurance-sdk";

const empty = { records: [], checkpoint: null, error: "" };

function createJournal(boundary) {
  const key = `agentenvelope:factory-assurance:${boundary}:v1`;
  let recordingError = "";

  function read() {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const state = JSON.parse(raw);
    if (!state || typeof state.chainId !== "string" ||
        !/^0x[0-9a-f]{64}$/u.test(state.reporterSeed) || !state.journal) {
      throw new Error("Invalid Factory Assurance journal");
    }
    return state;
  }

  function snapshot() {
    try {
      const state = read();
      if (!state) return { ...empty, error: recordingError };
      const { chainId, reporterSeed, journal } = state;
      if (!verifyEventJournal(journal, { chainId, reporterAddress: seedAddress(hexToBytes(reporterSeed)) })) {
        throw new Error("Factory Assurance signatures or chain links failed verification");
      }
      return { records: journal.records, checkpoint: checkpointFor(journal.entries.at(-1)), error: recordingError };
    } catch (error) {
      return { ...empty, error: error.message };
    }
  }

  async function record(correlationId, subject, events, observedAt) {
    try {
      const subjectDigest = contentHash(subject);
      if (!navigator.locks) throw new Error("Web Locks are required to save Factory Assurance records");
      await navigator.locks.request(key, async () => {
        const previous = read();
        const chainId = previous?.chainId ?? `factory_${boundary}_${crypto.randomUUID()}`;
        const reporterSeed = previous?.reporterSeed ?? "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)),
          byte => byte.toString(16).padStart(2, "0")).join("");
        let journal = previous?.journal ?? null;
        const recorder = createEventRecorder({
          chainId,
          reporterSeed: hexToBytes(reporterSeed),
          store: {
            read: () => journal,
            update(change) {
              journal = change(journal);
              return journal;
            },
          },
        });
        for (const [kind, reasonCode] of events) {
          await recorder.record({ eventId: crypto.randomUUID(), kind, observedAt, correlationId, subjectDigest, reasonCode });
        }
        window.localStorage.setItem(key, JSON.stringify({ chainId, reporterSeed, journal }));
      });
    } catch (error) {
      recordingError = error.message;
    }
    return snapshot();
  }

  return { key, snapshot, record };
}

export default function useFactoryAssurance(boundary) {
  const [journal] = useState(() => createJournal(boundary));
  const [snapshot, setSnapshot] = useState(journal.snapshot);

  useEffect(() => {
    const refresh = event => {
      if (event.key === journal.key || event.key === null) setSnapshot(journal.snapshot());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [journal]);

  const report = useCallback((subject, events, correlationId) => {
    const id = correlationId ?? globalThis.crypto?.randomUUID?.() ?? null;
    void journal.record(id, subject, events, Date.now()).then(setSnapshot);
    return id;
  }, [journal]);

  return { snapshot, report };
}
