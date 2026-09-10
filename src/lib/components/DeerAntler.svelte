<script lang="ts">
	// A stag's antlers in a few brush strokes — the Deer-1 mark.
	let {
		opacity = 1,
		flip = false,
		className = '',
		title = 'Antlers'
	}: {
		opacity?: number;
		flip?: boolean;
		className?: string;
		title?: string;
	} = $props();

	const uid = Math.random().toString(36).slice(2, 8);
</script>

<svg
	viewBox="0 0 150 96"
	role="img"
	aria-label={title}
	class={['block', className].join(' ')}
	style:opacity={opacity}
	style:transform={flip ? 'scaleX(-1)' : undefined}
	xmlns="http://www.w3.org/2000/svg"
>
	<defs>
		<filter id={`an-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
			<feTurbulence type="fractalNoise" baseFrequency="0.05 0.11" numOctaves="2" seed="5" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
		</filter>
		<g id={`beam-${uid}`} fill="none" stroke="var(--ink)" stroke-linecap="round">
			<path d="M78 86 C 80 64, 90 48, 108 38" stroke-width="6" />
			<path d="M85 64 C 92 56, 98 47, 101 39" stroke-width="4" />
			<path d="M97 47 C 103 41, 109 37, 114 35" stroke-width="3.2" />
			<path d="M81 74 C 79 66, 75 60, 70 57" stroke-width="3.4" />
		</g>
	</defs>
	<g filter={`url(#an-${uid})`}>
		<use href={`#beam-${uid}`} />
		<use href={`#beam-${uid}`} transform="translate(150 0) scale(-1 1)" />
	</g>
</svg>
