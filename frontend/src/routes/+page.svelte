<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import {
        Card,
        CardHeader,
        CardTitle,
        CardDescription,
        CardContent,
    } from "$lib/components/ui/card/index.js";
    import { appState } from "$lib/state/app.svelte.js";
    import {
        Plus,
        FolderOpen,
        ArrowRight,
        Trash2,
        SunIcon,
        MoonIcon,
    } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import NewProjectDialog from "$lib/components/NewProjectDialog.svelte";
    import { toggleMode } from "mode-watcher";

    let dialogOpen = $state(false);

    function handleNewProject(): void {
        dialogOpen = true;
    }

    function handleCreateEmpty(name: string): void {
        const project = appState.createProject(name);
        dialogOpen = false;
        goto(`/editor/${project.id}`);
    }

    function handleCreateWithTestData(
        name: string,
        entityCount: number,
        linkDensity: number,
    ): void {
        const project = appState.createProjectWithTestData(name, undefined, {
            entityCount,
            linkDensity,
        });
        dialogOpen = false;
        goto(`/editor/${project.id}`);
    }

    function handleOpenProject(id: string): void {
        goto(`/editor/${id}`);
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
</script>

<svelte:head>
    <title>MBSE Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-background">
    <header class="border-b flex">
        <div class="container mx-auto px-4 py-6">
            <h1 class="text-3xl font-bold">MBSE Dashboard</h1>
            <p class="text-muted-foreground mt-1">
                Model-Based Systems Engineering Visualization & Management
            </p>
        </div>
        <div class="flex items-center w-32">
            <Button onclick={toggleMode} variant="outline" size="icon">
                <SunIcon
                    class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90"
                />
                <MoonIcon
                    class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0"
                />
                <span class="sr-only">Toggle theme</span>
            </Button>
        </div>
    </header>

    <main class="container mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-8">
            <div>
                <h2 class="text-2xl font-semibold">Projects</h2>
                <p class="text-muted-foreground text-sm">
                    {appState.projects.length} project{appState.projects
                        .length !== 1
                        ? "s"
                        : ""} saved locally
                </p>
            </div>
            <Button onclick={handleNewProject}>
                <Plus class="size-4 mr-2" />
                New Project
            </Button>
        </div>

        {#if appState.projects.length === 0}
            <Card class="text-center py-12">
                <CardContent>
                    <FolderOpen
                        class="size-12 mx-auto text-muted-foreground mb-4"
                    />
                    <CardTitle class="mb-2">No Projects Yet</CardTitle>
                    <CardDescription class="mb-4">
                        Create a new project or load an MBSE JSON file to get
                        started
                    </CardDescription>
                    <Button onclick={handleNewProject}>
                        <Plus class="size-4 mr-2" />
                        Create First Project
                    </Button>
                </CardContent>
            </Card>
        {:else}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each appState.projects as project (project.id)}
                    <Card
                        class="cursor-pointer hover:shadow-md transition-shadow"
                        onclick={() => handleOpenProject(project.id)}
                    >
                        <CardHeader>
                            <CardTitle
                                class="flex items-center justify-between gap-2"
                            >
                                <span class="truncate">{project.name}</span>
                                <div
                                    class="flex items-center gap-1 flex-shrink-0"
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="size-8 text-muted-foreground hover:text-destructive"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            appState.deleteProject(project.id);
                                        }}
                                    >
                                        <Trash2 class="size-4" />
                                    </Button>
                                    <ArrowRight
                                        class="size-4 text-muted-foreground"
                                    />
                                </div>
                            </CardTitle>
                            <CardDescription>
                                {#if project.description}
                                    {project.description}
                                {:else}
                                    {project.data.entities.length} entities, {project
                                        .data.relationships.length} relationships
                                {/if}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p class="text-xs text-muted-foreground">
                                Last modified: {formatDate(project.updatedAt)}
                            </p>
                        </CardContent>
                    </Card>
                {/each}
            </div>
        {/if}
    </main>
</div>

<NewProjectDialog
    open={dialogOpen}
    onClose={() => (dialogOpen = false)}
    onCreateEmpty={handleCreateEmpty}
    onCreateWithTestData={handleCreateWithTestData}
/>
