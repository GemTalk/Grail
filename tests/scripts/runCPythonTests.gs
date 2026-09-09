output pushnew  runCPythonTests.gs.out
! file tests/scripts/runCPythonTests.gs
login
run
| dir |
"Ask importlib for the checkout root instead of guessing one: grailDir honours
an explicit ``grailDir:'' and otherwise resolves lazily, preferring a candidate
that really holds src/python/stdlib.  Export the resolved value to GRAIL_DIR --
the Python half reads os.environ there -- only when it is unset or disagrees."
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| result libPath |
libPath := [CPythonLibrary libraryPath] on: Error do: [:ex |
    Transcript show: 'CPythonTestCase: skipped (', ex messageText, ')'.
    ExitClientError signal: 'Skipped' status: 0.
].
(libPath isNil or: [libPath isEmpty or: [(GsFile existsOnServer: libPath) not]]) ifTrue: [
    Transcript show: 'CPythonTestCase: skipped (library not found at ', libPath printString, ')'.
    ExitClientError signal: 'Skipped' status: 0.
].
"Select the embedded CPython backend for this session, before any C
extension is imported."
EmbeddedExtensionModule useAsImportBackend.
result := CPythonTestCase suite run.
result hasPassed ifTrue: [
    Transcript show: result printString; cr.
    ExitClientError signal: 'Embedded tests passed!' status: 0.
] ifFalse: [
    Transcript nextPutAll: 'Embedded test failures:'; cr.
    result failures do: [:each | Transcript tab; show: each; cr.].
    Transcript nextPutAll: 'Embedded test errors:'; cr.
    result errors do: [:each | Transcript tab; show: each; cr.].
    Transcript show: result printString; cr.
    ExitClientError signal: 'Embedded tests failed!' status: 1.
].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report (e.g. an error escaped SUnit) -- fail loudly instead of exit 0.
exit 1
