<script lang="ts">
	// A small arc of swallows in brush-ink silhouette.
	let {
		opacity = 1,
		className = '',
		title = 'Swallows in flight'
	}: {
		opacity?: number;
		className?: string;
		title?: string;
	} = $props();

	const uid = Math.random().toString(36).slice(2, 8);

	const birds = [
		{ x: 6, y: 46, s: 1, r: -4 },
		{ x: 62, y: 22, s: 0.78, r: -6 },
		{ x: 108, y: 6, s: 0.56, r: -8 }
	];
</script>

<svg
	viewBox="0 0 150 64"
	role="img"
	aria-label={title}
	class={['block', className].join(' ')}
	style:opacity={opacity}
	xmlns="http://www.w3.org/2000/svg"
>
	<defs>
		<filter id={`bk-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
			<feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="11" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" />
		</filter>
		<path
			id={`sw-${uid}`}
			d="M5 24 C 11 19, 16 18, 20 19
			   C 26 14, 33 11, 41 11
			   L 58 7 L 52 16 L 59 24 L 50 27
			   C 41 27, 34 26, 29 25
			   C 25 26, 20 26, 17 25
			   C 13 27, 8 26, 5 24 Z
			   M20 19 C 27 8, 40 2, 53 3 C 43 9, 33 14, 26 20 Z"
			fill="var(--ink)"
		/>
	</defs>
	<g filter={`url(#bk-${uid})`}>
		{#each birds as b (b.x)}
			<use
				href={`#sw-${uid}`}
				transform={`translate(${b.x} ${b.y}) rotate(${b.r}) scale(${b.s})`}
			/>
		{/each}
	</g>
</svg>
