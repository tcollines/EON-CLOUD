$dll = (Get-ChildItem -Path C:\Users\USER\.nuget\packages\dokannet -Recurse -Filter DokanNet.dll | Select-Object -First 1).FullName
[Reflection.Assembly]::LoadFrom($dll) | Out-Null
[DokanNet.IDokanFileInfo].GetProperties() | Select-Object Name
