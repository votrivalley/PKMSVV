# PKMSVV Windows SmartScreen

PKMSVV được GitHub Actions đóng gói thành EXE portable chưa ký số. Do không có chữ ký Authenticode được một nhà phát hành đáng tin cậy cấp, SmartScreen có thể báo "Unknown publisher". Mỗi EXE mới có hash khác nên cảnh báo có thể lặp lại.

Đổi tên EXE, icon Poké Ball, trường author trong package.json, hoặc thêm dòng Việt hóa của Votri Valley không giải quyết chữ ký số.

## Biện pháp lâu dài

1. Đăng ký chứng chỉ ký mã hợp lệ (Authenticode) hay dịch vụ ký phù hợp với tên nhà phát hành.
2. Tích hợp ký và timestamp cho từng EXE trong GitHub Actions. Không đưa private key vào repository hoặc chat; dùng hệ thống ký bảo mật.
3. Kiểm tra chữ ký và phát hành từ một kênh ổn định. Ký số hỗ trợ xác minh người phát hành nhưng không cam kết SmartScreen hết cảnh báo ngay; uy tín tải xuống vẫn cần tích lũy.
4. Xuất SHA-256 để người tải xác minh và luôn quét file bằng Defender trước khi chạy.

Không khuyến nghị tắt Defender/SmartScreen toàn hệ thống. Hiện workflow Windows cấu hình CSC_IDENTITY_AUTO_DISCOVERY=false, không có chứng chỉ ký.

## Kiểm tra bằng PowerShell

```powershell
Get-AuthenticodeSignature ".\PKMSVV-0.6.2-Windows-x64.exe" | Format-List
Get-FileHash ".\PKMSVV-0.6.2-Windows-x64.exe" -Algorithm SHA256
```

NotSigned nghĩa là không có chữ ký; bản thân trạng thái này không đủ để kết luận mã độc.
