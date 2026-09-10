<script lang="ts">
	// Cinnabar ink-seal stamp carrying 鹿 (deer) — the site's signature mark.
	let {
		size = 44,
		rotation = '-4deg',
		title = 'Deer-1 seal'
	}: {
		size?: number;
		rotation?: string;
		title?: string;
	} = $props();
</script>

<span
	role="img"
	aria-label={title}
	title={title}
	class="deco-seal select-none leading-none"
	style="width:{size}px; height:{size}px; font-size:{Math.round(size * 0.56)}px; background: var(--cinnabar); transform: rotate({rotation});"
>
	<span class="char-hanzi" lang="zh" style="color: #fdf6e8;">鹿</span>
</span>
