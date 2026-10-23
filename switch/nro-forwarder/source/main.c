/*
 * PKMSVV - Switch hbmenu shortcut, built using devkitPro/libnx.
 * Opens the installed local PKMSVV app in Brewser without displaying its
 * catalogue or requiring the user to manually type the internal URL.
 *
 * This is NOT a standalone game runtime. Needs both:
 *   sdmc:/switch/brewser.nro
 *   sdmc:/switch/brewser/apps/com.votrivalley.pkmsvv/index.html
 *
 * Brewser parses --fwd=<appId> in browser-shell.ts. Do not rename the ID.
 */
#include <stdio.h>
#include <stdbool.h>
#include <switch.h>

static void explain(const char *msg) {
    consoleInit(NULL);
    printf("\x1b[2J\x1b[H");
    printf("Pokemon Survivor\n");
    printf("Viet hoa va Mod dieu chinh boi Votri Valley\n\n");
    printf("%s\n\n", msg);
    printf("Press PLUS (+) to exit to hbmenu.\n");
    PadState pad;
    padConfigureInput(1, HidNpadStyleSet_NpadStandard);
    padInitializeDefault(&pad);
    while (appletMainLoop()) {
        padUpdate(&pad);
        if (padGetButtonsDown(&pad) & HidNpadButton_Plus) break;
        consoleUpdate(NULL);
    }
    consoleExit(NULL);
}

int main(int argc, char **argv) {
    const char *runtime = "sdmc:/switch/brewser.nro";
    const char *entry = "sdmc:/switch/brewser/apps/com.votrivalley.pkmsvv/index.html";
    const char *args = "\"sdmc:/switch/brewser.nro\" \"--fwd=com.votrivalley.pkmsvv\"";

    if (!envHasNextLoad()) {
        explain("Needs hbloader/Atmosphere to launch the game runtime.\nOpen PKMSVV.nro from Homebrew Menu.");
        return 0;
    }

    Result rc = fsdevMountSdmc();
    if (R_FAILED(rc)) {
        explain("Cannot mount SD card. Insert/reseat the card.");
        return 0;
    }

    FILE *fp = fopen(runtime, "rb");
    if (!fp) {
        explain("Missing sd:/switch/brewser.nro\nInstall Brewser from its official release first.");
        return 0;
    }
    fclose(fp);
    fp = fopen(entry, "rb");
    if (!fp) {
        explain("PKMSVV game files not found.\nExtract the PKMSVV Switch ZIP to the SD card root.");
        return 0;
    }
    fclose(fp);

    rc = envSetNextLoad(runtime, args);
    if (R_FAILED(rc)) {
        explain("Brewser launch handoff failed.\nCheck hbmenu, Atmosphere and available memory.");
        return 0;
    }
    // Returning tells hbloader to chainload Brewser with the app ID.
    return 0;
}
