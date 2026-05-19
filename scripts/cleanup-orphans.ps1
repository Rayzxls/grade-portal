# Cleanup orphan classrooms, students, and courses left by previous QA runs
# Uses the teacher API to safely remove test data
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:4000/api/v1'

Write-Host "===== ORPHAN CLEANUP =====" -ForegroundColor Cyan

# Login as teacher
$t = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"email":"teacher@school.ac.th","password":"password123"}'
$h = @{ Authorization = "Bearer $($t.accessToken)"; 'Content-Type' = 'application/json' }

# --- 1. List all classrooms ---
$rooms = Invoke-RestMethod "$base/teacher/classrooms" -Headers $h
Write-Host "Found $($rooms.Count) classrooms" -ForegroundColor Yellow

# Identify orphan rooms: QA-created rooms have high section numbers or QA student codes
$seededSections = @(1, 2)  # known seed data sections
$orphanRooms = $rooms | Where-Object { $_.section -notin $seededSections }
Write-Host "Orphan rooms to clean: $($orphanRooms.Count)" -ForegroundColor Yellow

foreach ($room in $orphanRooms) {
  $rid = $room.id
  Write-Host "`n--- Cleaning room $rid (grade=$($room.gradeLevel) sec=$($room.section)) ---" -ForegroundColor Magenta

  # Delete students in this room first
  if ($room.students) {
    foreach ($s in $room.students) {
      Write-Host "  Deleting student $($s.studentCode)..." -NoNewline
      try {
        Invoke-RestMethod "$base/teacher/students/$($s.id)" -Method Delete -Headers $h | Out-Null
        Write-Host " OK" -ForegroundColor Green
      } catch {
        Write-Host " FAIL (trying unassign)" -ForegroundColor Red
        try {
          Invoke-RestMethod "$base/teacher/students/$($s.id)/unassign" -Method Post -Headers $h -Body '{}' | Out-Null
          Invoke-RestMethod "$base/teacher/students/$($s.id)" -Method Delete -Headers $h | Out-Null
          Write-Host "    Retry OK" -ForegroundColor Green
        } catch {
          Write-Host "    Retry FAIL: $_" -ForegroundColor Red
        }
      }
    }
  }

  # Get terms to find subjects
  $terms = Invoke-RestMethod "$base/teacher/terms" -Headers $h
  foreach ($term in $terms) {
    try {
      $subjects = Invoke-RestMethod "$base/teacher/classrooms/$rid/subjects?termId=$($term.id)" -Headers $h
      foreach ($subj in $subjects) {
        # Delete any scoresheet first
        try {
          $sheet = Invoke-RestMethod "$base/teacher/classrooms/$rid/sheet?courseId=$($subj.courseId)&termId=$($term.id)" -Headers $h
          if ($sheet -and $sheet.id) {
            if ($sheet.finalizedAt) {
              Invoke-RestMethod "$base/teacher/sheets/$($sheet.id)/reopen" -Method Post -Headers $h -Body '{}' | Out-Null
            }
            Invoke-RestMethod "$base/teacher/sheets/$($sheet.id)" -Method Delete -Headers $h | Out-Null
            Write-Host "  Deleted sheet $($sheet.id)" -ForegroundColor Green
          }
        } catch { <# no sheet — fine #> }

        # Remove subject link
        Write-Host "  Removing subject courseId=$($subj.courseId)..." -NoNewline
        try {
          Invoke-RestMethod "$base/teacher/classrooms/$rid/subjects?courseId=$($subj.courseId)&termId=$($term.id)" -Method Delete -Headers $h | Out-Null
          Write-Host " OK" -ForegroundColor Green
        } catch { Write-Host " SKIP" -ForegroundColor Yellow }
      }
    } catch { <# no subjects for this term #> }
  }

  # Delete the room itself
  Write-Host "  Deleting room..." -NoNewline
  try {
    Invoke-RestMethod "$base/teacher/classrooms/$rid" -Method Delete -Headers $h | Out-Null
    Write-Host " OK" -ForegroundColor Green
  } catch {
    Write-Host " FAIL: $_" -ForegroundColor Red
  }
}

# --- 2. Cleanup orphan QA courses ---
$courses = Invoke-RestMethod "$base/teacher/courses" -Headers $h
$orphanCourses = $courses | Where-Object { $_.code -like 'QA-*' }
Write-Host "`nOrphan QA courses to clean: $($orphanCourses.Count)" -ForegroundColor Yellow

foreach ($c in $orphanCourses) {
  Write-Host "  Deleting course $($c.code)..." -NoNewline
  try {
    Invoke-RestMethod "$base/teacher/courses/$($c.id)" -Method Delete -Headers $h | Out-Null
    Write-Host " OK" -ForegroundColor Green
  } catch {
    Write-Host " FAIL (has enrollments/grades)" -ForegroundColor Red
  }
}

# --- 3. Verify ---
$rooms2 = Invoke-RestMethod "$base/teacher/classrooms" -Headers $h
$courses2 = Invoke-RestMethod "$base/teacher/courses" -Headers $h
Write-Host "`n===== POST-CLEANUP STATE =====" -ForegroundColor Cyan
Write-Host "Classrooms remaining: $($rooms2.Count)"
$rooms2 | ForEach-Object { Write-Host "  $($_.gradeLevel)/$($_.section) ($($_.academicYear)) — students: $($_._count.students)" }
Write-Host "Courses remaining: $($courses2.Count)"
$courses2 | ForEach-Object { Write-Host "  $($_.code) — $($_.name)" }
