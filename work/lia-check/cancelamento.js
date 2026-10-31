async (page) => {
  // Each run installs its own synthetic stream and starts in the ready voice view.
  await page.addInitScript(() => {
    window.__liaTest = { streams: [], contexts: [] };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const destination = audio.createMediaStreamDestination();
      oscillator.connect(destination);
      oscillator.start();
      await audio.resume();
      window.__liaTest.streams.push(destination.stream);
      window.__liaTest.contexts.push(audio);
      return destination.stream;
    }});
  });
  await page.goto('http://127.0.0.1:3103/paciente');
  await page.getByRole('button', { name: /Falar com a Lia/ }).click();
  const result = {};
  let messages = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/paciente/conversa') messages++;
  });
  await page.evaluate(() => {
    window.__testGetUserMediaOriginal = navigator.mediaDevices.getUserMedia;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => new Promise(resolve => {
      window.__releasePermission = async () => resolve(await window.__testGetUserMediaOriginal());
    }) });
  });
  await page.getByRole('button', { name: 'Começar a falar', exact: true }).click();
  await page.getByRole('heading', { name: 'Preparando o microfone…', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.evaluate(() => window.__releasePermission());
  await page.waitForFunction(() => window.__liaTest.streams.every(s => s.getTracks().every(t => t.readyState === 'ended')));
  result.latePermissionStopped = true;
  await page.evaluate(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: window.__testGetUserMediaOriginal }));
  await page.getByRole('button', { name: 'Começar a falar', exact: true }).click();
  await page.getByRole('button', { name: 'Parar e transcrever', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  if (!(await page.evaluate(() => window.__liaTest.streams.every(s => s.getTracks().every(t => t.readyState === 'ended'))))) throw new Error('Navigation left microphone running');
  result.navigationStopsMicrophone = true;
  await page.getByRole('button', { name: /Falar com a Lia/ }).click();

  await page.unroute('**/api/transcrever-audio');
  let release;
  let reached;
  const requested = new Promise(resolve => { reached = resolve; });
  await page.route('**/api/transcrever-audio', route => {
    release = () => route.fulfill({ json: { sucesso: true, transcricao: 'Não posso ir à consulta.' } });
    reached();
  });
  await page.getByRole('button', { name: 'Começar a falar', exact: true }).click();
  await page.getByRole('button', { name: 'Parar e transcrever', exact: true }).click();
  await requested;
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/transcrever-audio');
  await release();
  await (await response).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if ((await page.getByRole('textbox', { name: 'Revise antes de enviar', exact: true }).count()) !== 0) throw new Error('Cancelled transcription returned to UI');
  if (!(await page.getByRole('button', { name: 'Começar a falar', exact: true }).isVisible())) throw new Error('Cancel did not restore ready state');
  if (messages !== 0) throw new Error('Cancelled operation sent a message');
  result.lateTranscriptionIgnored = true;

  await page.evaluate(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) }));
  await page.getByRole('button', { name: 'Começar a falar', exact: true }).click();
  await page.getByText('Não consegui usar o microfone. Verifique a permissão ou continue digitando.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Prefiro digitar', exact: true }).click();
  await page.getByRole('textbox', { name: /Mensagem para a Lia/ }).waitFor();
  result.permissionErrorAllowsText = true;
  result.cancelledMessages = messages;
  await page.evaluate(() => window.__liaTest.contexts.filter(context => context.state !== 'closed').forEach(context => context.close()));
  return result;
}
