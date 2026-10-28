/*
 * Pokemon Chuyen Sinh -- one-file Switch NRO installer / launcher.
 * The NRO RomFS carries the ORIGINAL Brewser runtime and entire patched
 * game. First launch copies both into the SD card, then chainloads Brewser.
 * Not a native port, no NSP, no Nintendo proprietary libraries or keys.
 */
#include <switch.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <errno.h>
#include <dirent.h>
#include <sys/stat.h>

#define APP_ID "com.votrivalley.pkmsvv"
#define RUNTIME "sdmc:/switch/brewser.nro"
#define GAME "sdmc:/switch/brewser/apps/" APP_ID
#define GAME_SOURCE "romfs:/game"
#define STAMP GAME "/.pkmsvv-nro-version"
#define BUFLEN 1024

static unsigned long doneFiles = 0;
static void failure(const char *message) {
    printf("\nERROR: %s\n\n", message);
    printf("Nothing was removed from the Switch save folder.\n");
    printf("Press + to exit.\n");
    consoleUpdate(NULL);
    PadState pad;
    padConfigureInput(1, HidNpadStyleSet_NpadStandard);
    padInitializeDefault(&pad);
    while (appletMainLoop()) {
        padUpdate(&pad);
        if (padGetButtonsDown(&pad) & HidNpadButton_Plus) break;
        consoleUpdate(NULL);
    }
}

static bool isFile(const char *p) {
    struct stat st;
    return stat(p, &st) == 0 && S_ISREG(st.st_mode) && st.st_size > 0;
}

static bool ensureDir(const char *p) {
    char dir[BUFLEN];
    if (strlen(p) >= sizeof(dir)) return false;
    strcpy(dir, p);
    for (char *a=dir+6; *a; a++) {
        if (*a != '/') continue;
        *a = 0;
        if (mkdir(dir, 0777) && errno != EEXIST) return false;
        *a = '/';
    }
    return !mkdir(dir, 0777) || errno == EEXIST;
}

static bool copyFile(const char *src, const char *dst) {
    FILE *in = fopen(src, "rb");
    if (!in) return false;
    char tmp[BUFLEN];
    if (snprintf(tmp, sizeof(tmp), "%s.pkmsvv.tmp", dst) >= (int)sizeof(tmp)) { fclose(in); return false; }
    FILE *out = fopen(tmp, "wb");
    if (!out) { fclose(in); return false; }
    unsigned char buffer[128*1024];
    size_t readCount;
    bool ok = true;
    while ((readCount=fread(buffer, 1, sizeof(buffer), in)) != 0) {
        if (fwrite(buffer, 1, readCount, out) != readCount) { ok=false; break; }
    }
    if (ferror(in) || fflush(out)) ok=false;
    if (fclose(out)) ok=false;
    fclose(in);
    if (!ok) { remove(tmp); return false; }
    // FAT rename won't consistently replace an existing file. Only replace
    // individual game assets; never remove a game/save directory.
    remove(dst);
    if (rename(tmp, dst)) { remove(tmp); return false; }
    doneFiles++;
    if (doneFiles % 100 == 0) {
        printf("Prepared %lu files...\n", doneFiles);
        consoleUpdate(NULL);
    }
    return true;
}

static bool copyTree(const char *src, const char *dst) {
    if (!ensureDir(dst)) return false;
    DIR *dir = opendir(src);
    if (!dir) return false;
    bool ok = true;
    struct dirent *entry;
    while ((entry=readdir(dir)) != NULL) {
        if (!strcmp(entry->d_name,".") || !strcmp(entry->d_name,"..")) continue;
        char a[BUFLEN],b[BUFLEN];
        if (snprintf(a,sizeof(a),"%s/%s",src,entry->d_name)>=(int)sizeof(a) ||
            snprintf(b,sizeof(b),"%s/%s",dst,entry->d_name)>=(int)sizeof(b)) {ok=false;break;}
        struct stat st;
        if (stat(a,&st)) {ok=false;break;}
        if (S_ISDIR(st.st_mode)) {
            if (!copyTree(a,b)) {ok=false;break;}
        } else if (S_ISREG(st.st_mode)) {
            if (!copyFile(a,b)) {ok=false;break;}
        }
    }
    closedir(dir);
    return ok;
}

static bool readVersion(char *dst,size_t max) {
    FILE *f=fopen("romfs:/version.txt","rb");
    if (!f) return false;
    bool ok=fgets(dst,(int)max,f)!=NULL;
    fclose(f);
    if (!ok) return false;
    dst[strcspn(dst,"\r\n")]=0;
    return dst[0]!=0;
}

static bool readyForVersion(const char *version) {
    char actual[64]={0};
    FILE *f=fopen(STAMP,"rb");
    if (!f) return false;
    bool ok=fgets(actual,sizeof(actual),f)!=NULL;
    fclose(f);
    if (!ok) return false;
    actual[strcspn(actual,"\r\n")]=0;
    return !strcmp(actual,version) && isFile(GAME "/index.html") &&
        isFile(GAME "/manifest.json");
}

static bool markVersion(const char *version) {
    FILE *f=fopen(STAMP,"wb");
    if (!f) return false;
    bool ok=fprintf(f,"%s\n",version)>0;
    if (fclose(f))ok=false;
    return ok;
}

int main(int argc,char **argv) {
    consoleInit(NULL);
    printf("POKEMON CHUYEN SINH - VOTRI VALLEY\n");
    printf("Switch NRO / offline installation\n\n");
    consoleUpdate(NULL);
    if (!envHasNextLoad()) {
        failure("Open this NRO using Atmosphere Homebrew Menu, in full-RAM mode.");
        consoleExit(NULL);return 1;
    }
    // libnx's default __appInit already calls fsdevMountSdmc(). Calling it
    // again can fail because "sdmc" is registered, even though SD is usable.
    // Reuse that mount and check actual access instead of trusting a second
    // mount's return code (which can misleadingly mean OutOfMemory).
    Result sdMountResult = 0;
    if (!fsdevGetDeviceFileSystem("sdmc"))
        sdMountResult = fsdevMountSdmc();
    DIR *sdRoot = opendir("sdmc:/");
    if (!sdRoot) {
        int sdErrno = errno;
        printf("microSD probe failed: mount result 0x%08X; errno %d\n",
               (unsigned)sdMountResult, sdErrno);
        failure("Cannot read microSD root. Check the card and Atmosphere's SD access.");
        consoleExit(NULL);return 1;
    }
    closedir(sdRoot);
    if (R_FAILED(romfsInit())) {
        failure("Game resources inside the NRO cannot be mounted.");consoleExit(NULL);return 1;
    }
    char version[64]={0};
    if (!readVersion(version,sizeof(version)) || !isFile("romfs:/brewser.nro") ||
        !isFile(GAME_SOURCE "/index.html") || !isFile(GAME_SOURCE "/manifest.json")) {
        failure("Incomplete embedded runtime/game. Download the complete PKMSVV.nro.");
        romfsExit();consoleExit(NULL);return 1;
    }
    // Keep any existing Brewser installation: don't replace a possibly newer
    // runtime. New users get the tested bundled runtime automatically.
    if (!isFile(RUNTIME)) {
        if (!ensureDir("sdmc:/switch") ||
            !copyFile("romfs:/brewser.nro",RUNTIME)) {
            failure("Unable to install the included Brewser engine. Check free space.");
            romfsExit();consoleExit(NULL);return 1;
        }
    }
    if (!readyForVersion(version)) {
        printf("First run / game update: %s\n", version);
        printf("Installing game data automatically; please do not close.\n");
        consoleUpdate(NULL);
        if (!copyTree(GAME_SOURCE,GAME) || !markVersion(version)) {
            failure("Cannot install game files. Free SD space and retry.");
            romfsExit();consoleExit(NULL);return 1;
        }
    }
    if (!isFile(GAME "/index.html")) {
        failure("Game entrypoint missing.");romfsExit();consoleExit(NULL);return 1;
    }
    printf("Game ready. Opening...\n");
    consoleUpdate(NULL);
    romfsExit();
    const char *args="\"sdmc:/switch/brewser.nro\" \"--fwd=1\" \"--app=com.votrivalley.pkmsvv\"";
    Result rc=envSetNextLoad(RUNTIME,args);
    if (R_FAILED(rc)) {
        failure("Cannot launch Brewser. Try launching NRO in full-RAM mode.");
        consoleExit(NULL);return 1;
    }
    consoleExit(NULL);
    return 0;
}
