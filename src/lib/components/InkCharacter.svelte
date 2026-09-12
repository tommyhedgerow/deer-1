<script lang="ts">
	// A single oversized ink character used as a watermark (e.g. 鹿 for Deer-1).
	let {
		char = '松',
		blur = 1.6,
		opacity = 0.055,
		className = ''
	}: {
		char?: string;
		blur?: number;
		opacity?: number;
		className?: string;
	} = $props();
</script>

<span
	class={['char-hanzi inline-block select-none leading-none text-ink', className].join(' ')}
	lang="zh"
	aria-hidden="true"
	style="opacity:{opacity}; filter: blur({blur}px);"
>
	{char}
</span>
