<script lang="ts">
	// Hand-drawn plum-blossom branch in the ink style: dark brush strokes whose
	// edges are perturbed by an SVG "shader" (feTurbulence + feDisplacementMap),
	// with cinnabar blossoms and moss leaves/buds.
	let {
		flip = false,
		opacity = 1,
		className = '',
		title = 'Plum blossom branch'
	}: {
		flip?: boolean;
		opacity?: number;
		className?: string;
		title?: string;
	} = $props();

	// unique filter ids per instance
	const uid = Math.random().toString(36).slice(2, 8);

	// branch / twig strokes, in viewBox units (0 0 260 300), root bottom-left
	const stems = [
		'M4 296 C 42 268, 64 244, 92 206 C 116 174, 132 140, 140 96 C 146 62, 142 34, 130 12', // main
		'M34 268 C 46 262, 62 258, 80 262',
		'M60 246 C 78 236, 98 228, 118 234',
		'M96 186 C 118 172, 138 158, 158 154',
		'M116 138 C 138 118, 154 96, 168 76',
		'M136 78 C 158 60, 182 52, 206 48',
		'M140 30 C 146 14, 150 4, 150 -6'
	];

	// blossoms at twig tips & along the branch
	const flowers = [
		{ x: 130, y: 12, s: 1.05, r: 0 },
		{ x: 150, y: -6, s: 0.8, r: 20 },
		{ x: 206, y: 48, s: 0.95, r: -14 },
		{ x: 168, y: 76, s: 0.8, r: 10 },
		{ x: 158, y: 154, s: 0.9, r: -18 },
		{ x: 118, y: 234, s: 0.75, r: 24 },
		{ x: 92, y: 206, s: 0.55, r: 40 },
		{ x: 64, y: 250, s: 0.6, r: 0 },
		{ x: 30, y: 300, s: 0.62, r: -22 },
		{ x: 12, y: 262, s: 0.45, r: 10 },
		{ x: 140, y: 60, s: 0.5, r: -30 }
	];

	// buds & leaves
	const buds = [
		{ x: 80, y: 262, r: 0, c: 'bud' },
		{ x: 96, y: 206, r: 40, c: 'leaf' },
		{ x: 134, y: 96, r: 18, c: 'leaf' },
		{ x: 160, y: 130, r: 60, c: 'bud' },
		{ x: 184, y: 52, r: -30, c: 'leaf' },
		{ x: 138, y: 34, r: 80, c: 'bud' },
		{ x: 44, y: 280, r: -20, c: 'leaf' }
	];
</script>

<svg
	viewBox="0 0 260 300"
	role="img"
	aria-label={title}
	class={['block', className].join(' ')}
	style:opacity={opacity}
	style:transform={flip ? 'scaleX(-1)' : undefined}
	xmlns="http://www.w3.org/2000/svg"
>
	<defs>
		<filter id={`br-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
			<feTurbulence type="fractalNoise" baseFrequency="0.04 0.09" numOctaves="2" seed="7" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
		</filter>
		<filter id={`petal-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
			<feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="3" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
		</filter>
		<g id={`fl-${uid}`}>
			{#each [0, 72, 144, 216, 288] as a}
				<ellipse
					cx="0"
					cy="-10.5"
					rx="7.4"
					ry="9.4"
					transform={`rotate(${a})`}
					fill="var(--cinnabar)"
					opacity="0.92"
				/>
			{/each}
			<circle r="2.6" fill="var(--paper)" />
			<circle r="1.3" fill="var(--cinnabar-ink)" />
		</g>
		<g id={`bd-${uid}`}>
			<circle r="3.4" fill="var(--cinnabar)" opacity="0.85" />
			<circle r="1.5" fill="var(--cinnabar-ink)" />
		</g>
		<g id={`lf-${uid}`}>
			<path d="M0 0 C 9 -5, 19 -5, 28 0 C 19 6, 9 6, 0 0 Z" fill="var(--moss)" opacity="0.85" />
		</g>
	</defs>

	<g filter={`url(#br-${uid})`}>
		{#each stems as d}
			<path
				d={d}
				fill="none"
				stroke="var(--ink)"
				stroke-width="5"
				stroke-linecap="round"
				opacity="0.88"
				transform="translate(2 0)"
			/>
		{/each}
		<path d="M4 296 C 42 268, 64 244, 92 206 C 116 174, 132 140, 140 96 C 146 62, 142 34, 130 12" fill="none" stroke="var(--ink)" stroke-width="2" opacity="0.4" transform="translate(-1.5 0)" />
	</g>

	<g filter={`url(#petal-${uid})`}>
		{#each flowers as f (f.x + ':' + f.y)}
			<use href={`#fl-${uid}`} transform={`translate(${f.x} ${f.y}) rotate(${f.r}) scale(${f.s})`} />
		{/each}
	</g>

	<g>
		{#each buds as b (b.x + ':' + b.y)}
			<use
				href={b.c === 'bud' ? `#bd-${uid}` : `#lf-${uid}`}
				transform={`translate(${b.x} ${b.y}) rotate(${b.r})`}
			/>
		{/each}
	</g>
</svg>
