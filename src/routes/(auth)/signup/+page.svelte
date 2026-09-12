<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Create an account — Deer-1</title>
	<meta
		name="description"
		content="Create a Deer-1 account to track the hanzi characters you are learning and know."
	/>
</svelte:head>

<AuthForm mode="signup" redirectTo={data.redirectTo} />
