# E2E QA — fresh isolated run, every flow
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:4000/api/v1'
$results = @()

function ErrBody($exception) {
  try {
    $r = $exception.Response
    if ($r) {
      $s = New-Object System.IO.StreamReader($r.GetResponseStream())
      return $s.ReadToEnd()
    }
  } catch {}
  return $exception.Message
}

function Step($name, $expectFail, $sb) {
  if (-not $PSBoundParameters.ContainsKey('expectFail')) { $expectFail = $false }
  $err = $null; $val = $null
  try { $val = & $sb } catch { 
    $err = ErrBody $_.Exception
    Write-Host "DEBUG: Step '$name' failed: $_" -ForegroundColor Red
    Write-Host "DEBUG: Detail: $err" -ForegroundColor Red
  }
  $passed = if ($expectFail) { $null -ne $err } else { $null -eq $err }
  $script:results += [PSCustomObject]@{
    name = $name
    status = if ($passed) { 'OK' } else { 'FAIL' }
    detail = if ($err) { $err.Substring(0, [Math]::Min(300, $err.Length)) } else { '' }
  }
  return $val
}

# ===== CLEANUP =====
$adm = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"email":"admin@school.ac.th","password":"password123"}'
$ah = @{ Authorization = "Bearer $($adm.accessToken)" }
# Skip cleanup — relies on teacher's safe deletes. We use unique IDs anyway.

# ===== TEACHER =====
$tLogin = Step 'Login teacher' $false { Invoke-RestMethod "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"email":"teacher@school.ac.th","password":"password123"}' }
$h = @{ Authorization = "Bearer $($tLogin.accessToken)"; 'Content-Type' = 'application/json' }

Step 'GET /teacher/classrooms' $false { Invoke-RestMethod "$base/teacher/classrooms" -Headers $h | Out-Null }
Step 'GET /teacher/courses'    $false { Invoke-RestMethod "$base/teacher/courses" -Headers $h | Out-Null }

# Test Term Creation by Teacher
$uniqueYear = (Get-Random -Min 2570 -Max 2599)
$termBody = @{
  year = $uniqueYear
  semester = 'SECOND'
  startDate = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  endDate = [DateTime]::UtcNow.AddMonths(6).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json
Step 'POST /teacher/terms (create)' $false { Invoke-RestMethod "$base/teacher/terms" -Method Post -Headers $h -Body $termBody | Out-Null }

$terms = Step 'GET /teacher/terms' $false { Invoke-RestMethod "$base/teacher/terms" -Headers $h }
$termId = $terms[0].id

# unique
$tag = [Guid]::NewGuid().ToString().Substring(0,8)
$sec = (Get-Random -Min 80 -Max 99)
$cb = @{ gradeLevel='ม.5'; section=$sec; academicYear=2568 } | ConvertTo-Json
$room = Step 'POST classroom (create)' $false { Invoke-RestMethod "$base/teacher/classrooms" -Method Post -Headers $h -Body $cb }
$rid = $room.id

Step 'PATCH classroom' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid" -Method Patch -Headers $h -Body (@{ section = $sec - 1 } | ConvertTo-Json) | Out-Null }

$bb = @{
  classroomId = $rid
  students = @(
    @{ studentCode = "QA-$tag-A"; fullName = "QA A"; enrollYear = 2568 }
    @{ studentCode = "QA-$tag-B"; fullName = "QA B"; enrollYear = 2568 }
    @{ studentCode = "QA-$tag-C"; fullName = "QA C"; enrollYear = 2568 }
  )
} | ConvertTo-Json -Depth 5
Step 'POST students/bulk (3 students)' $false { Invoke-RestMethod "$base/teacher/students/bulk" -Method Post -Headers $h -Body $bb | Out-Null }

$cbc = @{ code = "QA-$tag"; name = 'QA Math'; credits = 2; gradeLevel = 'ม.5' } | ConvertTo-Json
$course = Step 'POST course (create)' $false { Invoke-RestMethod "$base/teacher/courses" -Method Post -Headers $h -Body $cbc }
$cid = $course.id
Step 'PATCH course' $false { Invoke-RestMethod "$base/teacher/courses/$cid" -Method Patch -Headers $h -Body (@{ credits=3 } | ConvertTo-Json) | Out-Null }

# Negative test: add subject with mismatched grade
$badCourse = Invoke-RestMethod "$base/teacher/courses" -Headers $h | Where-Object { $_.gradeLevel -eq 'ม.4' } | Select-Object -First 1
if ($badCourse) {
  Step 'POST subjects (grade mismatch — should FAIL)' $true { Invoke-RestMethod "$base/teacher/classrooms/$rid/subjects" -Method Post -Headers $h -Body (@{ courseId=$badCourse.id; termId=$termId } | ConvertTo-Json) | Out-Null }
}

Step 'POST subjects (add)' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid/subjects" -Method Post -Headers $h -Body (@{ courseId=$cid; termId=$termId } | ConvertTo-Json) | Out-Null }
$subjects = Step 'GET subjects' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid/subjects?termId=$termId" -Headers $h }

Step 'GET sheet (empty)' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid/sheet?courseId=$cid&termId=$termId" -Headers $h | Out-Null }

$sb2 = @{ courseId=$cid; termId=$termId; columns=@(@{ name='กลาง'; maxScore=50 }, @{ name='ปลาย'; maxScore=50 }) } | ConvertTo-Json -Depth 5
$sheetCreated = Step 'POST sheet (create)' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid/sheet" -Method Post -Headers $h -Body $sb2 }
$sheet = Step 'GET sheet (with rows)' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid/sheet?courseId=$cid&termId=$termId" -Headers $h }
$sheetId = $sheet.id
$col1 = $sheet.columns[0].id
$col2 = $sheet.columns[1].id

$cells = @{ cells = @(
  @{ columnId=$col1; studentId=$sheet.rows[0].studentId; value=40 }
  @{ columnId=$col2; studentId=$sheet.rows[0].studentId; value=45 }
  @{ columnId=$col1; studentId=$sheet.rows[1].studentId; value=30 }
)} | ConvertTo-Json -Depth 5
Step 'POST cells' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId/cells" -Method Post -Headers $h -Body $cells | Out-Null }

# Validation: cells out of range — should fail silently (server skips invalid, returns ok with low count)
$badCells = @{ cells = @(@{ columnId=$col1; studentId=$sheet.rows[0].studentId; value=999 }) } | ConvertTo-Json -Depth 5
$r = Step 'POST cells (over max — should skip)' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId/cells" -Method Post -Headers $h -Body $badCells }

Step 'PATCH column (rename + maxScore)' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId/columns/$col1" -Method Patch -Headers $h -Body (@{ name='กลางใหม่'; maxScore=60 } | ConvertTo-Json) | Out-Null }

$newCol = Step 'POST column (add)' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId/columns" -Method Post -Headers $h -Body (@{ name='งาน'; maxScore=20 } | ConvertTo-Json) }
Step 'DELETE column' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId/columns/$($newCol.id)" -Method Delete -Headers $h | Out-Null }

Step 'POST finalize' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId/finalize" -Method Post -Headers $h -Body '{}' | Out-Null }
Step 'DELETE sheet (locked — should FAIL)' $true { Invoke-RestMethod "$base/teacher/sheets/$sheetId" -Method Delete -Headers $h | Out-Null }
Step 'POST reopen' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId/reopen" -Method Post -Headers $h -Body '{}' | Out-Null }
Step 'DELETE sheet (ok)' $false { Invoke-RestMethod "$base/teacher/sheets/$sheetId" -Method Delete -Headers $h | Out-Null }

# Refresh room (students may have changed)
$room = Invoke-RestMethod "$base/teacher/classrooms" -Headers $h | Where-Object { $_.id -eq $rid }
$students = $room.students

# Test student CRUD on all 3
if ($students.Count -ge 3) {
  Step 'PATCH student (rename)' $false { Invoke-RestMethod "$base/teacher/students/$($students[0].id)" -Method Patch -Headers $h -Body (@{ fullName='QA A renamed' } | ConvertTo-Json) | Out-Null }
  Step 'POST unassign student' $false { Invoke-RestMethod "$base/teacher/students/$($students[1].id)/unassign" -Method Post -Headers $h -Body '{}' | Out-Null }
  Step 'DELETE student' $false { Invoke-RestMethod "$base/teacher/students/$($students[2].id)" -Method Delete -Headers $h | Out-Null }
  # Also delete student #1 (was renamed) to clear classroom for safe delete
  Step 'DELETE renamed student' $false { Invoke-RestMethod "$base/teacher/students/$($students[0].id)" -Method Delete -Headers $h | Out-Null }
}

# Try delete classroom (should now be empty)
Step 'DELETE classroom subject' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid/subjects?courseId=$cid&termId=$termId" -Method Delete -Headers $h | Out-Null }

# Course should be deletable (no enrollments after subject removal — but Grade record was created at finalize!)
Step 'DELETE course (may FAIL — grade exists)' $true { Invoke-RestMethod "$base/teacher/courses/$cid" -Method Delete -Headers $h | Out-Null }

# Refresh again
$room = Invoke-RestMethod "$base/teacher/classrooms" -Headers $h | Where-Object { $_.id -eq $rid }
Write-Host "Final room state: students=$($room._count.students) sheets=$($room._count.scoreSheets)" -ForegroundColor Yellow

Step 'DELETE classroom' $false { Invoke-RestMethod "$base/teacher/classrooms/$rid" -Method Delete -Headers $h | Out-Null }

# ===== REPORT =====
Write-Host ""
Write-Host "===== QA RESULTS =====" -ForegroundColor Cyan
$results | ForEach-Object {
  $color = if ($_.status -eq 'OK') { 'Green' } else { 'Red' }
  Write-Host ("[{0}] {1}" -f $_.status, $_.name) -ForegroundColor $color
  if ($_.status -eq 'FAIL') { Write-Host "    -> $($_.detail)" -ForegroundColor DarkRed }
}
$fails = ($results | Where-Object { $_.status -eq 'FAIL' }).Count
Write-Host ""
Write-Host "Total: $($results.Count) | Pass: $($results.Count - $fails) | Fail: $fails" -ForegroundColor Cyan
