import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type TranscriptionModel = { id: string; description: string; provider: string };
type SpeechModel = { id: string; description: string; voices: string[]; instructions: boolean };
type ModelCatalog = { configured: boolean; providers: Record<string, boolean>; transcription: TranscriptionModel[]; speech: SpeechModel[] };
type TranscriptResult = { model: string; transcript: string | null; duration_ms: number; error: string | null };
type SpeechSample = { id: string; url: string; model: string; voice: string; text: string; duration: number | null };
type Mode = "transcribe" | "speak";

const sampleText = "Hi, I’m looking for an everyday backpack under fifty dollars. Please compare the available options and add one to my cart.";
const spokenLanguages = [
  ["unknown", "Auto detect"], ["en-IN", "English"], ["as-IN", "Assamese"], ["bn-IN", "Bengali"],
  ["brx-IN", "Bodo"], ["doi-IN", "Dogri"], ["gu-IN", "Gujarati"], ["hi-IN", "Hindi"],
  ["kn-IN", "Kannada"], ["ks-IN", "Kashmiri"], ["kok-IN", "Konkani"], ["mai-IN", "Maithili"],
  ["ml-IN", "Malayalam"], ["mni-IN", "Manipuri (Meitei)"], ["mr-IN", "Marathi"], ["ne-IN", "Nepali"],
  ["od-IN", "Odia"], ["pa-IN", "Punjabi"], ["sa-IN", "Sanskrit"], ["sat-IN", "Santali"],
  ["sd-IN", "Sindhi"], ["ta-IN", "Tamil"], ["te-IN", "Telugu"], ["ur-IN", "Urdu"],
];

export default function App() {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [mode, setMode] = useState<Mode>("transcribe");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(["sarvam-saaras-v4", "hf-indic-seamless"]);
  const [translateToEnglish, setTranslateToEnglish] = useState(true);
  const [languageCode, setLanguageCode] = useState("unknown");
  const [prompt, setPrompt] = useState("");
  const [transcriptResults, setTranscriptResults] = useState<TranscriptResult[]>([]);
  const [speechText, setSpeechText] = useState(sampleText);
  const [speechModelId, setSpeechModelId] = useState("gpt-4o-mini-tts");
  const [speechVoice, setSpeechVoice] = useState("coral");
  const [instructions, setInstructions] = useState("Speak clearly in a friendly, natural tone.");
  const [speechSamples, setSpeechSamples] = useState<SpeechSample[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechSamplesRef = useRef<SpeechSample[]>([]);

  const audioPreviewUrl = useMemo(() => audioFile ? URL.createObjectURL(audioFile) : null, [audioFile]);
  const speechModel = catalog?.speech.find((model) => model.id === speechModelId);

  useEffect(() => {
    fetch("/api/voice/models")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the voice model list.");
        return response.json() as Promise<ModelCatalog>;
      })
      .then(setCatalog)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not connect to the backend."));
  }, []);

  useEffect(() => {
    if (!audioPreviewUrl) return;
    return () => URL.revokeObjectURL(audioPreviewUrl);
  }, [audioPreviewUrl]);

  useEffect(() => {
    speechSamplesRef.current = speechSamples;
  }, [speechSamples]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => () => {
    speechSamplesRef.current.forEach((sample) => URL.revokeObjectURL(sample.url));
  }, []);

  useEffect(() => {
    const voices = catalog?.speech.find((model) => model.id === speechModelId)?.voices ?? [];
    if (voices.length && !voices.includes(speechVoice)) setSpeechVoice(voices[0]);
  }, [catalog, speechModelId, speechVoice]);

  async function startRecording() {
    setError("");
    setNotice("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        setAudioFile(new File(chunks, `voice-sample.${extension}`, { type }));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setNotice("Recording ready. Select transcription models and compare.");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setNotice("Recording from your microphone…");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError("Microphone access failed. Upload an audio file instead.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function toggleModel(modelId: string) {
    setSelectedModels((current) => current.includes(modelId)
      ? current.filter((model) => model !== modelId)
      : [...current, modelId]);
  }

  async function compareTranscriptions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setTranscriptResults([]);
    if (!audioFile) return setError("Record a sample or choose an audio file first.");
    if (!selectedModels.length) return setError("Choose at least one transcription model.");
    const form = new FormData();
    form.append("audio", audioFile, audioFile.name);
    selectedModels.forEach((model) => form.append("models", model));
    form.append("translate_to_english", String(translateToEnglish));
    form.append("language_code", languageCode);
    if (prompt.trim()) form.append("prompt", prompt.trim());
    setBusy(true);
    try {
      const response = await fetch("/api/voice/compare", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "Transcription comparison failed.");
      setTranscriptResults(body.results as TranscriptResult[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Transcription comparison failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateSpeech(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!speechText.trim()) return setError("Enter text for the voice models to read.");
    setBusy(true);
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: speechModelId,
          voice: speechVoice,
          input: speechText.trim(),
          instructions: speechModel?.instructions ? instructions : null,
          response_format: "mp3",
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail ?? "Speech generation failed.");
      }
      const nextUrl = URL.createObjectURL(await response.blob());
      setSpeechSamples((current) => [{
        id: crypto.randomUUID(),
        url: nextUrl,
        model: speechModelId,
        voice: speechVoice,
        text: speechText.trim(),
        duration: Number(response.headers.get("X-Generation-Ms")) || null,
      }, ...current]);
      setNotice("Generated audio is AI speech.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Speech generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="VocaPilot Voice Lab home">
          <span className="brand-mark">v</span>
          <span>VocaPilot<span className="brand-light"> / Voice Lab</span></span>
        </a>
        <div className={`api-state ${catalog?.configured ? "ready" : ""}`}>
          <span className="state-dot" />
          {catalog?.configured ? "Voice providers ready" : catalog ? "Add provider credentials" : error ? "API unavailable" : "Connecting…"}
        </div>
      </header>

      <section className="intro" id="top">
        <div className="eyebrow"><span className="eyebrow-line" /> MULTI-PROVIDER AUDIO PLAYGROUND</div>
        <h1>Find the right<br /><em>voice for you.</em></h1>
        <p className="intro-copy">Compare OpenAI and Sarvam speech recognition with an optional local Hugging Face model. Try supported Indian languages and English transcription or translation.</p>
        <div className="model-note">Provider access, billing, and model licenses vary. Compare outputs on your own recordings.</div>
      </section>

      <nav className="mode-tabs" aria-label="Voice model testing mode">
        <button className={mode === "transcribe" ? "active" : ""} onClick={() => setMode("transcribe")}>
          <span className="tab-icon">↳</span> Speech to text <span className="tab-number">01</span>
        </button>
        <button className={mode === "speak" ? "active" : ""} onClick={() => setMode("speak")}>
          <span className="tab-icon">♫</span> Text to speech <span className="tab-number">02</span>
        </button>
      </nav>

      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert notice" role="status">{notice}</div>}

      {mode === "transcribe" ? (
        <section className="workspace">
          <form className="panel input-panel" onSubmit={compareTranscriptions}>
            <div className="panel-heading">
              <div><span className="step">01</span><h2>Your recording</h2></div>
              <span className="panel-label">AUDIO INPUT</span>
            </div>
            <p className="panel-copy">Record a phrase or upload one clip. Compare supported Indian-language and English speech transcripts or English translations.</p>

            <div className="record-row">
              <button className={`record-button ${recording ? "recording" : ""}`} type="button" onClick={recording ? stopRecording : startRecording}>
                <span className="record-icon">{recording ? "■" : "●"}</span>{recording ? "Stop recording" : "Record sample"}
              </button>
              <span className="or-label">OR</span>
              <label className="upload-button">
                Upload audio <span>↗</span>
                <input type="file" accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg" onChange={(event) => {
                  setAudioFile(event.target.files?.[0] ?? null);
                  setTranscriptResults([]);
                }} />
              </label>
            </div>

            {audioFile ? (
              <div className="audio-file">
                <div className="file-symbol">♫</div>
                <div className="file-info"><strong>{audioFile.name}</strong><span>{(audioFile.size / 1024).toFixed(0)} KB · ready to compare</span></div>
                <button type="button" className="text-button" onClick={() => setAudioFile(null)}>Remove</button>
              </div>
            ) : (
              <div className="drop-hint"><span className="upload-glyph">↑</span>Audio files up to 25 MB</div>
            )}
            {audioPreviewUrl && <audio className="source-player" controls src={audioPreviewUrl}>Your browser cannot play this audio file.</audio>}

            <div className="section-rule" />
            <label className="field-label" htmlFor="language-code">Spoken language</label>
            <select id="language-code" className="select-input" value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
              {spokenLanguages.map(([code, name]) => <option value={code} key={code}>{name}</option>)}
            </select>
            <label className="translation-toggle"><input type="checkbox" checked={translateToEnglish} onChange={(event) => setTranslateToEnglish(event.target.checked)} /> Return English translation where supported</label>
            <p className="field-help">Sarvam Saaras v4 supports all 22 scheduled Indian languages and English. Hugging Face IndicSeamless supports a smaller Indian-language subset. OpenAI English translation uses whisper-1.</p>
            <div className="subhead-row"><h3>Choose models</h3><span>UP TO 4 AT ONCE</span></div>
            <div className="model-list">
              {catalog?.transcription.map((model) => (
                <label className={`model-option ${selectedModels.includes(model.id) ? "selected" : ""}`} key={model.id}>
                  <input type="checkbox" checked={selectedModels.includes(model.id)} onChange={() => toggleModel(model.id)} />
                  <span className="checkmark" />
                  <span className="model-details"><strong>{model.id}</strong><small>{model.description}</small></span>
                  {model.id === "sarvam-saaras-v4" && <span className="recommended">INDIC LANGUAGES</span>}
                </label>
              ))}
            </div>
            <label className="field-label" htmlFor="context">Context hint <span>OPTIONAL</span></label>
            <input id="context" className="text-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Names or words likely to appear in the audio" maxLength={1000} />
            <p className="field-help">The same context is sent with each selected model.</p>
            <button className="primary-button" type="submit" disabled={busy || !catalog}>
              {busy ? <><span className="spinner" /> Comparing models…</> : <>Compare transcripts <span>→</span></>}
            </button>
            <p className="disabled-note">Set OPENAI_API_KEY, SARVAM_API_KEY, or HF_TOKEN in backend/.env for the selected provider. The Hugging Face option also needs its optional dependencies and accepted model access.</p>
          </form>

          <section className="panel results-panel">
            <div className="panel-heading">
              <div><span className="step">02</span><h2>Listen &amp; compare</h2></div>
              <span className="panel-label">TRANSCRIPT RESULTS</span>
            </div>
            <p className="panel-copy">Each selected model receives the same recording. Results include response time and any API access errors.</p>
            {transcriptResults.length ? (
              <div className="result-list">
                {transcriptResults.map((result) => (
                  <article className={`transcript-result ${result.error ? "failed" : ""}`} key={result.model}>
                    <div className="result-top"><strong>{result.model}</strong><span>{result.duration_ms.toLocaleString()} ms</span></div>
                    {result.error ? <p className="result-error">{result.error}</p> : <blockquote>{result.transcript || "No transcript returned."}</blockquote>}
                    {result.transcript && <button className="text-button copy-button" onClick={() => navigator.clipboard.writeText(result.transcript!)}>Copy transcript</button>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-results">
                <div className="waveform" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ height: `${12 + Math.abs(Math.sin(index * 0.76)) * 45}px` }} />)}</div>
                <strong>Your results will show here</strong>
                <span>Choose a recording and run one or more models to compare their transcripts.</span>
              </div>
            )}
            <div className="comparison-footnote"><span>i</span> Transcript quality depends on language, recording clarity, and vocabulary. Compare the actual outputs for your use case.</div>
          </section>
        </section>
      ) : (
        <section className="workspace speech-workspace">
          <form className="panel input-panel" onSubmit={generateSpeech}>
            <div className="panel-heading">
              <div><span className="step">01</span><h2>Write a sample</h2></div>
              <span className="panel-label">TEXT INPUT</span>
            </div>
            <p className="panel-copy">Use one sample sentence to compare model and voice combinations.</p>
            <label className="field-label" htmlFor="speech-text">Sample text</label>
            <textarea id="speech-text" className="text-area" rows={5} maxLength={2000} value={speechText} onChange={(event) => setSpeechText(event.target.value)} />
            <div className="char-count">{speechText.length} / 2,000</div>
            <div className="section-rule" />
            <label className="field-label" htmlFor="speech-model">Speech model</label>
            <select id="speech-model" className="select-input" value={speechModelId} onChange={(event) => setSpeechModelId(event.target.value)}>
              {catalog?.speech.map((model) => <option value={model.id} key={model.id}>{model.id} — {model.description}</option>)}
            </select>
            <label className="field-label" htmlFor="speech-voice">Voice</label>
            <select id="speech-voice" className="select-input" value={speechVoice} onChange={(event) => setSpeechVoice(event.target.value)}>
              {speechModel?.voices.map((voice) => <option key={voice} value={voice}>{voice}</option>)}
            </select>
            {speechModel?.instructions && <>
              <label className="field-label" htmlFor="instructions">Speaking direction <span>OPTIONAL</span></label>
              <input id="instructions" className="text-input" value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={1000} />
            </>}
            <button className="primary-button" type="submit" disabled={busy || !catalog?.providers.openai}>
              {busy ? <><span className="spinner" /> Generating audio…</> : <>Generate voice sample <span>→</span></>}
            </button>
            {!catalog?.providers.openai && <p className="disabled-note">Add OPENAI_API_KEY to backend/.env, then restart the API.</p>}
          </form>

          <section className="panel results-panel speech-result-panel">
            <div className="panel-heading">
              <div><span className="step">02</span><h2>Listen to the result</h2></div>
              <span className="panel-label">AI GENERATED SPEECH</span>
            </div>
            <p className="panel-copy">Generate the same sample with different models and voices, then play the results here.</p>
            {speechSamples.length ? (
              <div className="speech-output">
                <div className="speech-history-heading"><span>{speechSamples.length} GENERATED SAMPLE{speechSamples.length === 1 ? "" : "S"}</span><button className="text-button" onClick={() => {
                  speechSamples.forEach((sample) => URL.revokeObjectURL(sample.url));
                  setSpeechSamples([]);
                }}>Clear samples</button></div>
                <div className="speech-samples">
                  {speechSamples.map((sample) => <article className="speech-sample" key={sample.id}>
                    <div className="speech-card-icon">♫</div>
                    <div className="speech-result-label"><strong>{sample.model}</strong><span>Voice · {sample.voice}{sample.duration ? ` · ${sample.duration.toLocaleString()} ms generation` : ""}</span></div>
                    <p>{sample.text}</p>
                    <audio controls src={sample.url}>Your browser cannot play this audio file.</audio>
                  </article>)}
                </div>
                <div className="ai-disclosure">Generated audio is AI speech.</div>
              </div>
            ) : (
              <div className="empty-results speech-empty">
                <div className="sound-orb">♫</div>
                <strong>Your voice sample will show here</strong>
                <span>Choose a model and voice, then generate audio to listen.</span>
              </div>
            )}
            <div className="comparison-footnote"><span>i</span> Voice choices depend on the model. The API project must have access to the selected model.</div>
          </section>
        </section>
      )}

      <footer className="footer"><span>VOCAPILOT · MODEL PLAYGROUND</span><span>Audio is sent to the selected cloud provider; Hugging Face inference runs locally.</span></footer>
    </main>
  );
}
