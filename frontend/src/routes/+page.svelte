<script lang="ts">
	import imageCompression from 'browser-image-compression';

	const API_BASE = 'http://localhost:8787';

	type Community = {
		id: string;
		name: string;
		role: 'owner' | 'admin' | 'member';
		created_at: string;
	};

	type MediaItem = {
		id: string;
		type: 'image' | 'video';
		r2_url: string;
		created_at: string;
	};

	type ReactionItem = {
		id: string;
		media_id: string;
		emoji_type: string | null;
		comment_text: string | null;
		created_at: string;
		user_name: string | null;
	};

	type RouletteShot = {
		roulette_id: string;
		target_month_year: string;
		media_id: string;
		media_type: 'image' | 'video';
		media_url: string;
		media_created_at: string;
		user_name: string | null;
	};

	let userId = $state('demo-user');
	let communities = $state<Community[]>([]);
	let communityId = $state('');
	let newCommunityName = $state('');
	let month = $state(new Date().toISOString().slice(0, 7));
	let file = $state<File | null>(null);
	let selectedType = $state<'image' | 'video' | null>(null);
	let mediaItems = $state<MediaItem[]>([]);
	let reactionsByMedia = $state<Record<string, ReactionItem[]>>({});
	let emojiDraftByMedia = $state<Record<string, string>>({});
	let commentDraftByMedia = $state<Record<string, string>>({});
	let selectedDay = $state<number | null>(null);
	let isLoadingCommunities = $state(false);
	let isLoadingMedia = $state(false);
	let rouletteShot = $state<RouletteShot | null>(null);
	let rouletteComment = $state('');
	let isRunningRoulette = $state(false);
	let isUploading = $state(false);
	let result = $state('');

	const isValidMonth = (value: string) => /^\d{4}-\d{2}$/.test(value);

	const getMonthInfo = (monthValue: string) => {
		const [year, monthNum] = monthValue.split('-').map(Number);
		const first = new Date(year, monthNum - 1, 1);
		const daysInMonth = new Date(year, monthNum, 0).getDate();
		const startWeekday = first.getDay();
		return { year, monthNum, daysInMonth, startWeekday };
	};

	const loadCommunities = async () => {
		if (!userId.trim()) return;
		isLoadingCommunities = true;
		try {
			const params = new URLSearchParams({ userId: userId.trim() });
			const response = await fetch(`${API_BASE}/api/communities?${params.toString()}`);
			const data = (await response.json()) as { error?: string; communities?: Community[] };

			if (!response.ok) {
				result = `コミュニティ取得失敗: ${data.error ?? 'failed'}`;
				return;
			}

			communities = data.communities ?? [];
			if (!communityId && communities.length > 0) {
				communityId = communities[0].id;
			}
		} catch (error) {
			result = `コミュニティ取得失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		} finally {
			isLoadingCommunities = false;
		}
	};

	const createCommunityAction = async () => {
		const name = newCommunityName.trim();
		if (!name || !userId.trim()) {
			result = 'コミュニティ名と userId を入力してください。';
			return;
		}

		try {
			const response = await fetch(`${API_BASE}/api/communities`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, userId: userId.trim() })
			});
			const data = (await response.json()) as { error?: string; community?: Community };

			if (!response.ok) {
				result = `コミュニティ作成失敗: ${data.error ?? 'failed'}`;
				return;
			}

			newCommunityName = '';
			await loadCommunities();
			if (data.community?.id) communityId = data.community.id;
			result = 'コミュニティを作成しました。';
		} catch (error) {
			result = `コミュニティ作成失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		}
	};

	const loadMedia = async () => {
		if (!communityId || !isValidMonth(month)) return;

		isLoadingMedia = true;
		try {
			const params = new URLSearchParams({ communityId, month });
			const response = await fetch(`${API_BASE}/api/media?${params.toString()}`);
			const data = (await response.json()) as { error?: string; media?: MediaItem[] };

			if (!response.ok) {
				result = `取得失敗: ${data.error ?? 'failed to load media'}`;
				return;
			}

			mediaItems = data.media ?? [];
		} catch (error) {
			result = `取得失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		} finally {
			isLoadingMedia = false;
		}
	};

	const loadReactionsForSelectedDay = async () => {
		if (!selectedDayItems.length) {
			reactionsByMedia = {};
			return;
		}

		const mediaIds = selectedDayItems.map((m) => m.id);
		const params = new URLSearchParams({ mediaIds: mediaIds.join(',') });

		try {
			const response = await fetch(`${API_BASE}/api/reactions/batch?${params.toString()}`);
			const data = (await response.json()) as { reactions?: ReactionItem[]; error?: string };

			if (!response.ok) {
				result = `リアクション取得失敗: ${data.error ?? 'failed'}`;
				return;
			}

			const map: Record<string, ReactionItem[]> = {};
			for (const reaction of data.reactions ?? []) {
				if (!map[reaction.media_id]) map[reaction.media_id] = [];
				map[reaction.media_id].push(reaction);
			}
			reactionsByMedia = map;
		} catch (error) {
			result = `リアクション取得失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		}
	};

	const loadRoulette = async () => {
		if (!communityId || !isValidMonth(month)) {
			rouletteShot = null;
			return;
		}

		try {
			const params = new URLSearchParams({ communityId, month });
			const response = await fetch(`${API_BASE}/api/roulette/current?${params.toString()}`);
			const data = (await response.json()) as { shot?: RouletteShot | null; error?: string };

			if (!response.ok) {
				result = `ベストショット取得失敗: ${data.error ?? 'failed'}`;
				return;
			}

			rouletteShot = data.shot ?? null;
		} catch (error) {
			result = `ベストショット取得失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		}
	};

	const runRouletteNow = async () => {
		if (!isValidMonth(month)) {
			result = 'month は YYYY-MM 形式で入力してください。';
			return;
		}

		isRunningRoulette = true;
		try {
			const response = await fetch(`${API_BASE}/api/roulette/run`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetMonthYear: month })
			});
			const data = (await response.json()) as { error?: string };

			if (!response.ok) {
				result = `ルーレット実行失敗: ${data.error ?? 'failed'}`;
				return;
			}

			await loadRoulette();
			result = 'ルーレットを実行しました。';
		} catch (error) {
			result = `ルーレット実行失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		} finally {
			isRunningRoulette = false;
		}
	};

	const mediaByDay = $derived.by(() => {
		const grouped = new Map<number, MediaItem[]>();
		for (const item of mediaItems) {
			const day = new Date(item.created_at).getDate();
			if (!grouped.has(day)) grouped.set(day, []);
			grouped.get(day)?.push(item);
		}
		return grouped;
	});

	const monthInfo = $derived(getMonthInfo(month));
	const calendarCells = $derived([
		...Array.from({ length: monthInfo.startWeekday }, () => null),
		...Array.from({ length: monthInfo.daysInMonth }, (_, i) => i + 1)
	]);
	const selectedDayItems = $derived((selectedDay ? mediaByDay.get(selectedDay) : []) ?? []);

	$effect(() => {
		if (!isValidMonth(month) || !communityId) return;
		void loadMedia();
	});

	$effect(() => {
		if (!isValidMonth(month) || !communityId) return;
		void loadRoulette();
	});

	$effect(() => {
		if (!userId.trim()) return;
		void loadCommunities();
	});

	$effect(() => {
		void loadReactionsForSelectedDay();
	});

	const submitReaction = async (mediaId: string) => {
		const emojiType = (emojiDraftByMedia[mediaId] ?? '').trim();
		const commentText = (commentDraftByMedia[mediaId] ?? '').trim();

		if (!emojiType && !commentText) {
			result = 'スタンプかコメントを入力してください。';
			return;
		}

		try {
			const response = await fetch(`${API_BASE}/api/reactions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mediaId, userId: userId.trim(), emojiType, commentText })
			});
			const data = (await response.json()) as { error?: string };

			if (!response.ok) {
				result = `リアクション失敗: ${data.error ?? 'failed'}`;
				return;
			}

			emojiDraftByMedia = { ...emojiDraftByMedia, [mediaId]: '' };
			commentDraftByMedia = { ...commentDraftByMedia, [mediaId]: '' };
			await loadReactionsForSelectedDay();
			result = 'リアクションを投稿しました。';
		} catch (error) {
			result = `リアクション失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		}
	};

	const onSelectFile = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		file = target.files?.[0] ?? null;
		selectedType = file?.type.startsWith('video/') ? 'video' : file?.type.startsWith('image/') ? 'image' : null;
	};

	const compressImage = async (input: File) => {
		return imageCompression(input, {
			maxSizeMB: 1,
			maxWidthOrHeight: 1920,
			useWebWorker: true
		});
	};

	const getVideoDurationSeconds = async (input: File) => {
		const video = document.createElement('video');
		video.preload = 'metadata';
		video.src = URL.createObjectURL(input);

		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => resolve();
			video.onerror = () => reject(new Error('動画メタデータの読み取りに失敗しました。'));
		});

		const duration = Math.ceil(video.duration || 0);
		URL.revokeObjectURL(video.src);

		if (!Number.isFinite(duration) || duration <= 0) {
			throw new Error('動画の長さを取得できませんでした。');
		}

		return duration;
	};

	const compressVideoTo720p = async (input: File) => {
		if (typeof MediaRecorder === 'undefined') {
			throw new Error('このブラウザは動画圧縮に未対応です。');
		}

		const source = document.createElement('video');
		source.muted = true;
		source.playsInline = true;
		source.src = URL.createObjectURL(input);

		await new Promise<void>((resolve, reject) => {
			source.onloadedmetadata = () => resolve();
			source.onerror = () => reject(new Error('動画読み込みに失敗しました。'));
		});

		const srcW = source.videoWidth;
		const srcH = source.videoHeight;
		if (!srcW || !srcH) {
			URL.revokeObjectURL(source.src);
			throw new Error('動画サイズの取得に失敗しました。');
		}

		const scale = Math.min(1, 1280 / srcW, 720 / srcH);
		const outW = Math.max(2, Math.floor((srcW * scale) / 2) * 2);
		const outH = Math.max(2, Math.floor((srcH * scale) / 2) * 2);

		const canvas = document.createElement('canvas');
		canvas.width = outW;
		canvas.height = outH;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			URL.revokeObjectURL(source.src);
			throw new Error('Canvas初期化に失敗しました。');
		}

		const stream = canvas.captureStream(30);
		const recordedChunks: Blob[] = [];
		const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
			? 'video/webm;codecs=vp9'
			: 'video/webm;codecs=vp8';

		const recorder = new MediaRecorder(stream, {
			mimeType: mime,
			videoBitsPerSecond: 1_800_000
		});

		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) recordedChunks.push(event.data);
		};

		const drawFrame = () => {
			ctx.drawImage(source, 0, 0, outW, outH);
			if (!source.paused && !source.ended) {
				requestAnimationFrame(drawFrame);
			}
		};

		await source.play();
		drawFrame();
		recorder.start(250);

		await new Promise<void>((resolve) => {
			source.onended = () => resolve();
		});

		await new Promise<void>((resolve) => {
			recorder.onstop = () => resolve();
			recorder.stop();
		});

		URL.revokeObjectURL(source.src);

		const blob = new Blob(recordedChunks, { type: 'video/webm' });
		const name = input.name.replace(/\.[^/.]+$/, '') + '.webm';
		return new File([blob], name, { type: 'video/webm' });
	};

	const upload = async () => {
		if (!file) {
			result = 'ファイルを選択してください。';
			return;
		}

		if (!selectedType) {
			result = '画像または動画ファイルを選択してください。';
			return;
		}

		isUploading = true;
		result = '圧縮中...';

		try {
			let compressed: File;
			let durationSeconds: number | undefined;

			if (selectedType === 'image') {
				compressed = await compressImage(file);
			} else {
				compressed = await compressVideoTo720p(file);
				durationSeconds = await getVideoDurationSeconds(compressed);
			}

			const form = new FormData();
			form.set('communityId', communityId);
			form.set('userId', userId);
			form.set('type', selectedType);
			form.set('month', month);
			form.set('file', compressed, compressed.name);
			if (selectedType === 'video' && durationSeconds) {
				form.set('durationSeconds', String(durationSeconds));
			}

			result = `アップロード中... (${Math.round(file.size / 1024)}KB → ${Math.round(compressed.size / 1024)}KB)`;

			const response = await fetch(`${API_BASE}/api/media/upload`, {
				method: 'POST',
				body: form
			});

			const data = (await response.json()) as { error?: string; media?: { r2_url?: string } };

			if (!response.ok) {
				result = `失敗: ${data.error ?? 'upload failed'}`;
				return;
			}

			result = `成功: ${data.media?.r2_url ?? 'saved'}`;
			await loadMedia();
		} catch (error) {
			result = `失敗: ${error instanceof Error ? error.message : 'unknown error'}`;
		} finally {
			isUploading = false;
		}
	};
</script>

<main>
	<h1>Hello World Upload</h1>

	<div class="form">
		<label>
			<span>userId</span>
			<input bind:value={userId} />
		</label>

		<div class="community-row">
			<label>
				<span>community</span>
				<select bind:value={communityId}>
					{#if communities.length === 0}
						<option value="">(no communities)</option>
					{:else}
						{#each communities as c}
							<option value={c.id}>{c.name} ({c.role})</option>
						{/each}
					{/if}
				</select>
			</label>
			<button onclick={loadCommunities} disabled={isLoadingCommunities}>
				{isLoadingCommunities ? 'Loading...' : 'Reload communities'}
			</button>
		</div>

		<div class="community-row">
			<input placeholder="new community name" bind:value={newCommunityName} />
			<button onclick={createCommunityAction}>Create community</button>
		</div>

		<label>
			<span>month (YYYY-MM)</span>
			<input bind:value={month} pattern="\\d{4}-\\d{2}" />
		</label>

		<label>
			<span>image / video file</span>
			<input type="file" accept="image/*,video/*" onchange={onSelectFile} />
		</label>

		{#if selectedType}
			<p class="hint">selected: {selectedType}</p>
		{/if}

		<button onclick={upload} disabled={isUploading}>
			{isUploading ? 'Uploading...' : 'Compress & Upload'}
		</button>

		<p class="result">{result}</p>
	</div>

	<section class="calendar-wrap">
		<div class="calendar-head">
			<h2>{monthInfo.year}年{String(monthInfo.monthNum).padStart(2, '0')}月 カレンダー</h2>
			<button onclick={loadMedia} disabled={isLoadingMedia}>
				{isLoadingMedia ? 'Loading...' : 'Refresh'}
			</button>
		</div>

		<div class="weekdays">
			<span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span>
		</div>
		<div class="calendar-grid">
			{#each calendarCells as day}
				{#if day === null}
					<div class="cell empty"></div>
				{:else}
					<button
						type="button"
						class:selected={selectedDay === day}
						class="cell day"
						onclick={() => (selectedDay = day)}
					>
						<strong>{day}</strong>
						<small>{mediaByDay.get(day)?.length ?? 0}件</small>
					</button>
				{/if}
			{/each}
		</div>
	</section>

	<section class="gallery">
		<h3>{selectedDay ? `${selectedDay}日のメディア` : '日付を選択してください'}</h3>
		{#if selectedDay && selectedDayItems.length === 0}
			<p>この日の投稿はありません。</p>
		{:else if selectedDay}
			<div class="cards">
				{#each selectedDayItems as item}
					<article class="card">
						{#if item.type === 'image'}
							<img src={item.r2_url} alt="uploaded" loading="lazy" />
						{:else}
							<!-- svelte-ignore a11y_media_has_caption -->
							<video src={item.r2_url} controls preload="metadata"></video>
						{/if}
						<p>{new Date(item.created_at).toLocaleString()}</p>

						<div class="reactions">
							{#each reactionsByMedia[item.id] ?? [] as reaction}
								<div class="reaction-item">
									<strong>{reaction.emoji_type ?? '💬'}</strong>
									<span>{reaction.comment_text ?? ''}</span>
									<small>by {reaction.user_name ?? reaction.id.slice(0, 6)}</small>
								</div>
							{/each}

							<div class="reaction-form">
								<input
									placeholder="emoji (例: ❤️)"
									value={emojiDraftByMedia[item.id] ?? ''}
									oninput={(e) =>
										(emojiDraftByMedia = {
											...emojiDraftByMedia,
											[item.id]: (e.currentTarget as HTMLInputElement).value
										})}
								/>
								<input
									placeholder="comment"
									value={commentDraftByMedia[item.id] ?? ''}
									oninput={(e) =>
										(commentDraftByMedia = {
											...commentDraftByMedia,
											[item.id]: (e.currentTarget as HTMLInputElement).value
										})}
								/>
								<button onclick={() => submitReaction(item.id)}>Send</button>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<section class="roulette">
		<div class="roulette-head">
			<h3>今月のベストショット</h3>
			<button onclick={runRouletteNow} disabled={isRunningRoulette}>
				{isRunningRoulette ? 'Running...' : 'Run roulette now'}
			</button>
		</div>

		{#if rouletteShot}
			<div class="bestshot">
				<div class="confetti" aria-hidden="true">
					{#each Array.from({ length: 24 }) as _, i}
						<span style={`--i:${i};`}></span>
					{/each}
				</div>

				{#if rouletteShot.media_type === 'image'}
					<img src={rouletteShot.media_url} alt="best shot" loading="lazy" />
				{:else}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={rouletteShot.media_url} controls preload="metadata"></video>
				{/if}

				<p>
					picked month: {rouletteShot.target_month_year} / by {rouletteShot.user_name ?? 'unknown'}
				</p>
				<textarea
					bind:value={rouletteComment}
					placeholder="ベストショット用コメント（ローカルメモ）"
				></textarea>
			</div>
		{:else}
			<p>今月のベストショットはまだ未抽選です。</p>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 980px;
		margin: 0 auto;
		padding: var(--size-8);
		display: grid;
		gap: var(--size-6);
	}

	h1 {
		font-size: var(--font-size-6);
		margin-bottom: var(--size-6);
	}

	.form {
		display: grid;
		gap: var(--size-4);
		padding: var(--size-5);
		border: 1px solid var(--gray-4);
		border-radius: var(--radius-3);
		background: var(--gray-0);
	}

	label {
		display: grid;
		gap: var(--size-2);
	}

	span {
		font-size: var(--font-size-1);
		color: var(--gray-7);
	}

	input {
		padding: var(--size-2) var(--size-3);
		border: 1px solid var(--gray-4);
		border-radius: var(--radius-2);
	}

	select {
		padding: var(--size-2) var(--size-3);
		border: 1px solid var(--gray-4);
		border-radius: var(--radius-2);
	}

	button {
		border: 0;
		border-radius: var(--radius-2);
		padding: var(--size-3) var(--size-4);
		background: var(--indigo-6);
		color: white;
		font-weight: var(--font-weight-6);
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.7;
		cursor: default;
	}

	.result {
		min-height: 1.5rem;
		color: var(--gray-8);
	}

	.hint {
		margin: 0;
		font-size: var(--font-size-1);
		color: var(--gray-7);
	}

	.community-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--size-3);
		align-items: end;
	}

	.calendar-wrap,
	.gallery,
	.roulette {
		padding: var(--size-5);
		border: 1px solid var(--gray-4);
		border-radius: var(--radius-3);
		background: var(--gray-0);
	}

	.calendar-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--size-3);
		margin-bottom: var(--size-3);
	}

	h2,
	h3 {
		margin: 0;
	}

	.weekdays,
	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--size-2);
	}

	.weekdays {
		margin-bottom: var(--size-2);
		color: var(--gray-7);
		font-size: var(--font-size-1);
	}

	.cell {
		min-height: 72px;
		border: 1px solid var(--gray-3);
		border-radius: var(--radius-2);
		padding: var(--size-2);
	}

	.cell.empty {
		background: var(--gray-1);
	}

	.cell.day {
		background: white;
		display: grid;
		align-content: space-between;
		text-align: left;
	}

	.cell.day.selected {
		outline: 2px solid var(--indigo-5);
	}

	.cards {
		margin-top: var(--size-3);
		display: grid;
		gap: var(--size-3);
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	}

	.card {
		border: 1px solid var(--gray-3);
		border-radius: var(--radius-2);
		overflow: hidden;
		background: white;
	}

	.card img,
	.card video {
		width: 100%;
		height: 180px;
		object-fit: cover;
		display: block;
	}

	.card p {
		margin: 0;
		padding: var(--size-2) var(--size-3);
		font-size: var(--font-size-0);
		color: var(--gray-7);
	}

	.reactions {
		display: grid;
		gap: var(--size-2);
		padding: var(--size-2) var(--size-3) var(--size-3);
	}

	.reaction-item {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--size-2);
		font-size: var(--font-size-1);
	}

	.reaction-item small {
		grid-column: 2;
		color: var(--gray-6);
	}

	.reaction-form {
		display: grid;
		grid-template-columns: 90px 1fr auto;
		gap: var(--size-2);
	}

	.roulette-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--size-3);
		margin-bottom: var(--size-3);
	}

	.bestshot {
		position: relative;
		display: grid;
		gap: var(--size-3);
	}

	.roulette img,
	.roulette video {
		width: 100%;
		max-height: 360px;
		object-fit: cover;
		border-radius: var(--radius-3);
	}

	.roulette textarea {
		width: 100%;
		min-height: 88px;
		padding: var(--size-3);
		border: 1px solid var(--gray-4);
		border-radius: var(--radius-2);
	}

	.confetti {
		pointer-events: none;
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.confetti span {
		position: absolute;
		top: -10px;
		left: calc((var(--i) / 24) * 100%);
		width: 8px;
		height: 12px;
		border-radius: var(--radius-pill);
		background: hsl(calc(var(--i) * 16deg) 90% 60%);
		animation: fall 3.2s linear infinite;
		animation-delay: calc(var(--i) * 0.06s);
		opacity: 0.85;
	}

	@keyframes fall {
		0% {
			transform: translateY(-8px) rotate(0deg);
		}
		100% {
			transform: translateY(380px) rotate(360deg);
		}
	}
</style>
