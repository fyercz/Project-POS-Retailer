#define UNICODE
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

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow) {
    (void)hInstance;
    (void)hPrevInstance;
    (void)nCmdShow;

    // 1. Ensure working directory is the folder of this .exe
    set_working_dir_to_exe();

    bool kioskMode = false;
    wchar_t currentExePath[MAX_PATH] = {0};
    if (GetModuleFileNameW(NULL, currentExePath, MAX_PATH) > 0) {
        if (wcsstr(currentExePath, L"kiosk") != NULL || wcsstr(currentExePath, L"Kiosk") != NULL) {
            kioskMode = true;
        }
    }
    if (pCmdLine && (wcsstr(pCmdLine, L"--kiosk") != NULL || wcsstr(pCmdLine, L"-k") != NULL)) {
        kioskMode = true;
    }

    // 2. Locate Node.js
    wchar_t nodePath[MAX_PATH] = {0};
    if (!locate_node_exe(nodePath, MAX_PATH)) {
        int choice = MessageBoxW(
            NULL,
            L"Runtime Node.js belum ditemukan di komputer kasir ini.\n\n"
            L"Aplikasi Ulilmart POS memerlukan Node.js untuk database lokal dan server transaksi.\n\n"
            L"Apakah Anda ingin membuka link unduh Node.js LTS resmi sekarang?\n"
            L"(Pilih 'Ya' untuk download otomatis, atau 'Tidak' untuk keluar)",
            L"Ulilmart POS - Node.js Diperlukan",
            MB_ICONEXCLAMATION | MB_YESNO | MB_DEFBUTTON1
        );

        if (choice == IDYES) {
            ShellExecuteW(NULL, L"open", L"https://nodejs.org/en/download", NULL, NULL, SW_SHOWNORMAL);
        }
        return 1;
    }

    // Inject Node folder into PATH for current process
    add_to_process_path(nodePath);

    // 3. Check if server is already running on port 3000
    int port = DEFAULT_PORT;
    bool serverRunning = is_port_open(port);
    PROCESS_INFORMATION piServer = {0};
    bool startedOwnServer = false;

    if (!serverRunning) {
        // Prepare server command line
        wchar_t cmdLine[1024];

        if (file_exists_w(L"dist\\server.cjs")) {
            swprintf(cmdLine, 1024, L"\"%s\" dist\\server.cjs", nodePath);
        } else if (file_exists_w(L"server.ts")) {
            // Development fallback
            swprintf(cmdLine, 1024, L"cmd.exe /c npx tsx server.ts");
        } else {
            MessageBoxW(
                NULL,
                L"File server (dist\\server.cjs) belum ditemukan.\n"
                L"Silakan jalankan build aplikasi terlebih dahulu.",
                APP_TITLE,
                MB_ICONERROR | MB_OK
            );
            return 1;
        }

        STARTUPINFOW siServer = {0};
        siServer.cb = sizeof(siServer);
        siServer.dwFlags = STARTF_USESHOWWINDOW;
        siServer.wShowWindow = SW_HIDE; // Run server completely hidden

        BOOL success = CreateProcessW(
            NULL,
            cmdLine,
            NULL,
            NULL,
            FALSE,
            CREATE_NO_WINDOW,
            NULL,
            NULL,
            &siServer,
            &piServer
        );

        if (!success) {
            MessageBoxW(
                NULL,
                L"Gagal menyalakan server kasir di latar belakang.\n"
                L"Pastikan izin administrator atau hak akses folder sudah sesuai.",
                APP_TITLE,
                MB_ICONERROR | MB_OK
            );
            return 1;
        }

        startedOwnServer = true;

        // Wait up to 25 seconds for server to respond
        int attempts = 0;
        while (attempts < 50) {
            Sleep(500);
            if (is_port_open(port)) {
                serverRunning = true;
                break;
            }
            // Check if server process terminated prematurely
            DWORD exitCode = 0;
            if (GetExitCodeProcess(piServer.hProcess, &exitCode) && exitCode != STILL_ACTIVE) {
                MessageBoxW(
                    NULL,
                    L"Server kasir berhenti tiba-tiba saat inisialisasi.\n"
                    L"Silakan periksa log server atau dependensi node_modules.",
                    APP_TITLE,
                    MB_ICONERROR | MB_OK
                );
                return 1;
            }
            attempts++;
        }

        if (!serverRunning) {
            MessageBoxW(
                NULL,
                L"Waktu tunggu server kasir habis (Timeout 25 detik).\n"
                L"Aplikasi akan mencoba membuka browser.",
                APP_TITLE,
                MB_ICONWARNING | MB_OK
            );
        }
    }

    // 4. Launch dedicated UI window (Edge or Chrome in --app mode, or default browser)
    wchar_t targetUrl[256];
    swprintf(targetUrl, 256, L"http://localhost:%d", port);

    wchar_t browserPath[MAX_PATH] = {0};
    bool browserFound = locate_browser_exe(browserPath, MAX_PATH);

    PROCESS_INFORMATION piBrowser = {0};
    bool startedBrowserProcess = false;

    if (browserFound) {
        wchar_t browserCmd[1024];
        if (kioskMode) {
            swprintf(browserCmd, 1024, L"\"%s\" --app=%s --kiosk", browserPath, targetUrl);
        } else {
            swprintf(browserCmd, 1024, L"\"%s\" --app=%s", browserPath, targetUrl);
        }

        STARTUPINFOW siBrowser = {0};
        siBrowser.cb = sizeof(siBrowser);

        BOOL bRes = CreateProcessW(
            NULL,
            browserCmd,
            NULL,
            NULL,
            FALSE,
            0,
            NULL,
            NULL,
            &siBrowser,
            &piBrowser
        );

        if (bRes) {
            startedBrowserProcess = true;
        } else {
            // Fallback to ShellExecute
            ShellExecuteW(NULL, L"open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
        }
    } else {
        // Fallback to default browser
        ShellExecuteW(NULL, L"open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
    }

    // 5. If we started a browser process and our own server:
    // Wait for the browser window to be closed by cashier, then cleanly stop background server
    if (startedBrowserProcess && startedOwnServer) {
        WaitForSingleObject(piBrowser.hProcess, INFINITE);

        // Kasir ditutup oleh user: matikan server background secara bersih
        if (piServer.hProcess) {
            TerminateProcess(piServer.hProcess, 0);
            CloseHandle(piServer.hProcess);
            CloseHandle(piServer.hThread);
        }
        CloseHandle(piBrowser.hProcess);
        CloseHandle(piBrowser.hThread);
    } else if (startedOwnServer) {
        // If we opened via shell execute, keep server handles closed
        CloseHandle(piServer.hProcess);
        CloseHandle(piServer.hThread);
    }

    return 0;
}
