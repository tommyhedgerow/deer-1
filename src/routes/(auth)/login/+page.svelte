<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sign in — Deer-1</title>
	<meta name="description" content="Sign in to Deer-1 to keep track of the hanzi you know." />
</svelte:head>

<AuthForm mode="login" redirectTo={data.redirectTo} />
