#ifndef UNICODE
#define UNICODE
#endif
#define _UNICODE
#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <shellapi.h>
#include <shlobj.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define DEFAULT_PORT 3000
#define APP_TITLE L"Ulilmart POS - Terminal Kasir"

// Check if a file exists on disk
static bool file_exists_w(const wchar_t* path) {
    DWORD attr = GetFileAttributesW(path);
    return (attr != INVALID_FILE_ATTRIBUTES && !(attr & FILE_ATTRIBUTE_DIRECTORY));
}

// Check if a directory exists on disk
static bool dir_exists_w(const wchar_t* path) {
    DWORD attr = GetFileAttributesW(path);
    return (attr != INVALID_FILE_ATTRIBUTES && (attr & FILE_ATTRIBUTE_DIRECTORY));
}

// Check if port is responding on 127.0.0.1
static bool is_port_open(int port) {
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) return false;

    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) {
        WSACleanup();
        return false;
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons((unsigned short)port);
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");

    DWORD timeout = 300;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&timeout, sizeof(timeout));

    bool connected = (connect(s, (struct sockaddr*)&addr, sizeof(addr)) == 0);
    closesocket(s);
    WSACleanup();
    return connected;
}

// Search for node.exe across multiple drives and common folders
static bool locate_node_exe(wchar_t* outPath, size_t maxLen) {
    // 1. Current directory or ./runtime/node.exe
    if (file_exists_w(L"node.exe")) {
        wcsncpy(outPath, L"node.exe", maxLen);
        return true;
    }
    if (file_exists_w(L"runtime\\node.exe")) {
        wcsncpy(outPath, L"runtime\\node.exe", maxLen);
        return true;
    }
    if (file_exists_w(L"bin\\node.exe")) {
        wcsncpy(outPath, L"bin\\node.exe", maxLen);
        return true;
    }

    // 2. Search Windows PATH
    wchar_t searchedPath[MAX_PATH];
    if (SearchPathW(NULL, L"node.exe", NULL, MAX_PATH, searchedPath, NULL) > 0) {
        wcsncpy(outPath, searchedPath, maxLen);
        return true;
    }

    // 3. Common Program Files & AppData paths
    wchar_t programFiles[MAX_PATH];
    wchar_t programFilesX86[MAX_PATH];
    wchar_t localAppData[MAX_PATH];
    wchar_t appData[MAX_PATH];

    if (GetEnvironmentVariableW(L"ProgramFiles", programFiles, MAX_PATH) > 0) {
        swprintf(searchedPath, MAX_PATH, L"%s\\nodejs\\node.exe", programFiles);
        if (file_exists_w(searchedPath)) {
            wcsncpy(outPath, searchedPath, maxLen);
            return true;
        }
    }

    if (GetEnvironmentVariableW(L"ProgramFiles(x86)", programFilesX86, MAX_PATH) > 0) {
        swprintf(searchedPath, MAX_PATH, L"%s\\nodejs\\node.exe", programFilesX86);
        if (file_exists_w(searchedPath)) {
            wcsncpy(outPath, searchedPath, maxLen);
            return true;
        }
    }

    if (GetEnvironmentVariableW(L"LOCALAPPDATA", localAppData, MAX_PATH) > 0) {
        swprintf(searchedPath, MAX_PATH, L"%s\\Programs\\nodejs\\node.exe", localAppData);
        if (file_exists_w(searchedPath)) {
            wcsncpy(outPath, searchedPath, maxLen);
            return true;
        }
        swprintf(searchedPath, MAX_PATH, L"%s\\Programs\\node\\node.exe", localAppData);
        if (file_exists_w(searchedPath)) {
            wcsncpy(outPath, searchedPath, maxLen);
            return true;
        }
    }

    if (GetEnvironmentVariableW(L"APPDATA", appData, MAX_PATH) > 0) {
        swprintf(searchedPath, MAX_PATH, L"%s\\nvm\\current\\node.exe", appData);
        if (file_exists_w(searchedPath)) {
            wcsncpy(outPath, searchedPath, maxLen);
            return true;
        }
    }

    // 4. Multi-drive hardcoded search (C:, D:, E:)
    const wchar_t* hardcodedLocations[] = {
        L"C:\\Program Files\\nodejs\\node.exe",
        L"C:\\Program Files (x86)\\nodejs\\node.exe",
        L"D:\\Program Files\\nodejs\\node.exe",
        L"D:\\nodejs\\node.exe",
        L"E:\\Program Files\\nodejs\\node.exe",
        L"E:\\nodejs\\node.exe",
        L"C:\\nodejs\\node.exe",
        L"C:\\nvm4w\\nodejs\\node.exe",
        L"C:\\ProgramData\\chocolatey\\bin\\node.exe"
    };

    for (size_t i = 0; i < sizeof(hardcodedLocations) / sizeof(hardcodedLocations[0]); i++) {
        if (file_exists_w(hardcodedLocations[i])) {
            wcsncpy(outPath, hardcodedLocations[i], maxLen);
            return true;
        }
    }

    return false;
}

// Locate browser (Microsoft Edge or Google Chrome)
static bool locate_browser_exe(wchar_t* outPath, size_t maxLen) {
    wchar_t testPath[MAX_PATH];
    wchar_t progFiles[MAX_PATH];
    wchar_t progFilesX86[MAX_PATH];
    wchar_t localApp[MAX_PATH];

    // Priority 1: Microsoft Edge (comes preinstalled on Windows 10/11)
    if (GetEnvironmentVariableW(L"ProgramFiles(x86)", progFilesX86, MAX_PATH) > 0) {
        swprintf(testPath, MAX_PATH, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", progFilesX86);
        if (file_exists_w(testPath)) {
            wcsncpy(outPath, testPath, maxLen);
            return true;
        }
    }
    if (GetEnvironmentVariableW(L"ProgramFiles", progFiles, MAX_PATH) > 0) {
        swprintf(testPath, MAX_PATH, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", progFiles);
        if (file_exists_w(testPath)) {
            wcsncpy(outPath, testPath, maxLen);
            return true;
        }
    }
    if (GetEnvironmentVariableW(L"LOCALAPPDATA", localApp, MAX_PATH) > 0) {
        swprintf(testPath, MAX_PATH, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", localApp);
        if (file_exists_w(testPath)) {
            wcsncpy(outPath, testPath, maxLen);
            return true;
        }
    }
    if (SearchPathW(NULL, L"msedge.exe", NULL, MAX_PATH, testPath, NULL) > 0) {
        wcsncpy(outPath, testPath, maxLen);
        return true;
    }

    // Priority 2: Google Chrome
    if (GetEnvironmentVariableW(L"ProgramFiles", progFiles, MAX_PATH) > 0) {
        swprintf(testPath, MAX_PATH, L"%s\\Google\\Chrome\\Application\\chrome.exe", progFiles);
        if (file_exists_w(testPath)) {
            wcsncpy(outPath, testPath, maxLen);
            return true;
        }
    }
    if (GetEnvironmentVariableW(L"ProgramFiles(x86)", progFilesX86, MAX_PATH) > 0) {
        swprintf(testPath, MAX_PATH, L"%s\\Google\\Chrome\\Application\\chrome.exe", progFilesX86);
        if (file_exists_w(testPath)) {
            wcsncpy(outPath, testPath, maxLen);
            return true;
        }
    }
    if (GetEnvironmentVariableW(L"LOCALAPPDATA", localApp, MAX_PATH) > 0) {
        swprintf(testPath, MAX_PATH, L"%s\\Google\\Chrome\\Application\\chrome.exe", localApp);
        if (file_exists_w(testPath)) {
            wcsncpy(outPath, testPath, maxLen);
            return true;
        }
    }
    if (SearchPathW(NULL, L"chrome.exe", NULL, MAX_PATH, testPath, NULL) > 0) {
        wcsncpy(outPath, testPath, maxLen);
        return true;
    }

    return false;
}

// Add Node.js directory to process PATH environment variable
static void add_to_process_path(const wchar_t* nodeExePath) {
    wchar_t nodeDir[MAX_PATH];
    wcsncpy(nodeDir, nodeExePath, MAX_PATH);
    wchar_t* lastSlash = wcsrchr(nodeDir, L'\\');
    if (lastSlash) {
        *lastSlash = L'\0';

        wchar_t currentPath[32768];
        DWORD len = GetEnvironmentVariableW(L"PATH", currentPath, 32768);
        if (len > 0) {
            wchar_t newPath[32768];
            swprintf(newPath, 32768, L"%s;%s", nodeDir, currentPath);
            SetEnvironmentVariableW(L"PATH", newPath);
        } else {
            SetEnvironmentVariableW(L"PATH", nodeDir);
        }
    }
}

// Set working directory to the executable's folder
static void set_working_dir_to_exe() {
    wchar_t exePath[MAX_PATH];
    if (GetModuleFileNameW(NULL, exePath, MAX_PATH) > 0) {
        wchar_t* lastSlash = wcsrchr(exePath, L'\\');
        if (lastSlash) {
            *lastSlash = L'\0';
            SetCurrentDirectoryW(exePath);
        }
    }
}

/*
 * Alur launcher (v1.1.1):
 *  1. Bila server kasir sudah berjalan di port 3000 (mis. dari MULAI-KASIR.bat / auto-start),
 *     langsung buka jendela kasir.
 *  2. Bila belum: pastikan aplikasi sudah dipasang & di-build (node_modules + dist\server.cjs).
 *     Bila belum, tawarkan menjalankan MULAI-KASIR.bat (yang memasang & build).
 *  3. Nyalakan server tersembunyi, keluaran dicatat ke server.log (sama dengan MULAI-KASIR.bat).
 *  4. Buka jendela kasir (Edge/Chrome mode aplikasi) dengan PROFIL BROWSER SENDIRI.
 *
 * Perbaikan dari versi lama:
 *  - Dulu launcher menunggu proses browser selesai lalu MEMATIKAN server. Edge hampir selalu
 *    sudah berjalan di latar (Startup boost), sehingga proses yang dibuka launcher langsung
 *    menyerahkan jendela ke Edge yang ada & selesai -> server dimatikan beberapa detik setelah
 *    dibuka. Kini server TIDAK dimatikan saat jendela ditutup (kasir lain di jaringan tetap
 *    terhubung); hentikan dengan BERHENTI-KASIR.bat, sama seperti MULAI-KASIR.bat.
 *  - Server dulu berjalan tanpa log; kini ke server.log.
 *  - Mode kiosk: nama file mengandung "Kiosk" atau argumen --kiosk (dulu teks "-k" di mana saja).
 */
int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow) {
    (void)hInstance;
    (void)hPrevInstance;
    (void)nCmdShow;

    set_working_dir_to_exe();

    bool kioskMode = false;
    wchar_t currentExePath[MAX_PATH] = {0};
    if (GetModuleFileNameW(NULL, currentExePath, MAX_PATH) > 0) {
        if (wcsstr(currentExePath, L"kiosk") != NULL || wcsstr(currentExePath, L"Kiosk") != NULL) {
            kioskMode = true;
        }
    }
    if (pCmdLine && wcsstr(pCmdLine, L"--kiosk") != NULL) {
        kioskMode = true;
    }

    int port = DEFAULT_PORT;

    if (!is_port_open(port)) {
        // Aplikasi harus sudah dipasang & di-build (launcher tidak memasang dependensi)
        if (!dir_exists_w(L"node_modules") || !file_exists_w(L"dist\\server.cjs")) {
            int choice = MessageBoxW(
                NULL,
                L"Aplikasi kasir belum dipasang atau belum di-build di folder ini.\n\n"
                L"Jalankan MULAI-KASIR.bat sekarang untuk memasang & menyalakan kasir?\n"
                L"(Hanya perlu sekali; setelah itu launcher ini bisa dipakai langsung.)",
                APP_TITLE,
                MB_ICONINFORMATION | MB_YESNO
            );
            if (choice == IDYES) {
                ShellExecuteW(NULL, L"open", L"MULAI-KASIR.bat", NULL, NULL, SW_SHOWNORMAL);
            }
            return 0;
        }

        wchar_t nodePath[MAX_PATH] = {0};
        if (!locate_node_exe(nodePath, MAX_PATH)) {
            int choice = MessageBoxW(
                NULL,
                L"Node.js tidak ditemukan di komputer ini.\n\n"
                L"Aplikasi Ulilmart POS memerlukan Node.js untuk server kasir.\n"
                L"Jalankan MULAI-KASIR.bat (dapat memasang Node.js otomatis)?",
                APP_TITLE,
                MB_ICONWARNING | MB_YESNO
            );
            if (choice == IDYES) {
                ShellExecuteW(NULL, L"open", L"MULAI-KASIR.bat", NULL, NULL, SW_SHOWNORMAL);
            }
            return 1;
        }
        add_to_process_path(nodePath);

        // Server tersembunyi; keluaran ke server.log (lewat cmd agar bisa dialihkan)
        wchar_t cmdLine[1400];
        swprintf(cmdLine, 1400, L"cmd.exe /d /s /c \"\"%s\" dist\\server.cjs >> server.log 2>&1\"", nodePath);

        STARTUPINFOW siServer = {0};
        siServer.cb = sizeof(siServer);
        siServer.dwFlags = STARTF_USESHOWWINDOW;
        siServer.wShowWindow = SW_HIDE;
        PROCESS_INFORMATION piServer = {0};
        if (!CreateProcessW(NULL, cmdLine, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &siServer, &piServer)) {
            MessageBoxW(
                NULL,
                L"Gagal menyalakan server kasir.\n"
                L"Coba jalankan MULAI-KASIR.bat untuk melihat pesan kesalahannya.",
                APP_TITLE,
                MB_ICONERROR | MB_OK
            );
            return 1;
        }

        bool ready = false;
        for (int attempts = 0; attempts < 120; attempts++) { // maks. 60 detik
            Sleep(500);
            if (is_port_open(port)) {
                ready = true;
                break;
            }
            DWORD exitCode = 0;
            if (GetExitCodeProcess(piServer.hProcess, &exitCode) && exitCode != STILL_ACTIVE) {
                MessageBoxW(
                    NULL,
                    L"Server kasir berhenti saat dinyalakan.\n\n"
                    L"Buka file server.log di folder aplikasi untuk melihat penyebabnya,\n"
                    L"atau jalankan update.bat bila aplikasi baru diperbarui.",
                    APP_TITLE,
                    MB_ICONERROR | MB_OK
                );
                CloseHandle(piServer.hProcess);
                CloseHandle(piServer.hThread);
                return 1;
            }
        }
        // Server dibiarkan berjalan (tidak dimatikan saat jendela kasir ditutup)
        CloseHandle(piServer.hProcess);
        CloseHandle(piServer.hThread);

        if (!ready) {
            MessageBoxW(
                NULL,
                L"Server kasir belum merespons setelah 60 detik.\n"
                L"Jendela kasir tetap dibuka; bila kosong, periksa server.log.",
                APP_TITLE,
                MB_ICONWARNING | MB_OK
            );
        }
    }

    wchar_t targetUrl[64];
    swprintf(targetUrl, 64, L"http://localhost:%d", port);

    // Profil browser sendiri: jendela kasir tidak bercampur dengan Edge/Chrome yang sudah terbuka
    wchar_t profileDir[MAX_PATH] = L"";
    wchar_t localAppData[MAX_PATH];
    if (GetEnvironmentVariableW(L"LOCALAPPDATA", localAppData, MAX_PATH) > 0) {
        swprintf(profileDir, MAX_PATH, L"%s\\UlilmartPOS\\Browser", localAppData);
    }

    wchar_t browserPath[MAX_PATH] = {0};
    if (locate_browser_exe(browserPath, MAX_PATH)) {
        wchar_t browserCmd[2048];
        if (profileDir[0]) {
            swprintf(browserCmd, 2048,
                L"\"%s\" --app=%s --user-data-dir=\"%s\" --no-first-run --no-default-browser-check%s",
                browserPath, targetUrl, profileDir, kioskMode ? L" --kiosk" : L"");
        } else {
            swprintf(browserCmd, 2048, L"\"%s\" --app=%s%s", browserPath, targetUrl, kioskMode ? L" --kiosk" : L"");
        }
        STARTUPINFOW siBrowser = {0};
        siBrowser.cb = sizeof(siBrowser);
        PROCESS_INFORMATION piBrowser = {0};
        if (CreateProcessW(NULL, browserCmd, NULL, NULL, FALSE, 0, NULL, NULL, &siBrowser, &piBrowser)) {
            CloseHandle(piBrowser.hProcess);
            CloseHandle(piBrowser.hThread);
        } else {
            ShellExecuteW(NULL, L"open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
        }
    } else {
        ShellExecuteW(NULL, L"open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
    }
    return 0;
}
