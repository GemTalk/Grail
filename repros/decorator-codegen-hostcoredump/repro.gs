! Reproducer: HostCoreDump triggered by the FunctionDefAst module-level
! decorator codegen change.  See ../../docs and README.md alongside.
!
! Crash signature (SIGSEGV / SIGABRT depending on which split-call hits
! the bad SrePattern first):
!
!   Assertion failed: (self->codesize != 0), function
!     _sre_SRE_Pattern_split_impl, file sre.c, line 1094.
!   GemStone signal handler: signal 6 (SIGABRT)
!
! Smalltalk stack at the moment of the crash:
!
!    4  SrePattern >> split: (envId 1) @IP 112
!   10  (block, homeMethod:_unquote_partial) @IP 256
!   11  Werkzeug_urls >> uri_to_iri: (envId 1) @IP 224
!   16  (Executed Code)
!
! Run from the project root:
!   source .setenv
!   LC_ALL=C topaz -lq -S repros/decorator-codegen-hostcoredump/repro.gs
!
! Pre-fix the script returns a HostCoreDump.  Post-fix it should print
! either an uri_to_iri result or a clean Python exception, and exit 0.

output pushnew /tmp/hostcoredump_repro.out only

iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

login
run
"Configure Grail loader for this fresh session."
importlib grailDir: '/Users/jfoster/code/GemStone/Grail'.
%
level 0

run
"Clear flask, werkzeug, jinja2 so loadModuleFromPath: re-emits each
module's initialize method with the codegen change active.  Without
the clear the cached methods from a prior install run might mask the
crash if those installs ran with the codegen change disabled."
| mods |
mods := importlib @env1:modules.
mods keys asArray do: [:k | | s |
  s := k asString.
  ((s size >= 5 and: [(s copyFrom: 1 to: 5) = 'flask']) or: [
   (s size >= 8 and: [(s copyFrom: 1 to: 8) = 'werkzeug']) or: [
   (s size >= 6 and: [(s copyFrom: 1 to: 6) = 'jinja2'])]])
    ifTrue: [mods removeKey: k ifAbsent: [nil]]].
System commitTransaction.
Transcript show: 'Cleared cached modules.'; cr.
%
level 0

run
"Load werkzeug.urls — module init calls _make_unquote_part(...) twice,
each returning a closure that captures a freshly-compiled re.compile
pattern.  Pre-fix that load completes."
| r |
[importlib loadModuleFromPath: '/Users/jfoster/code/GemStone/Grail/src/python/stdlib/werkzeug/urls.py' name: 'werkzeug.urls'.
 r := 'OK']
  on: AbstractException do: [:ex | r := ex class name asString, ': ', ex messageText].
Transcript show: 'werkzeug.urls load: ', r; cr.
%
level 0

run
"Call uri_to_iri.  Inside the closure ``_unquote_partial'', the
captured Pattern is invoked via ``pattern.split(value)''.  With the
codegen change the captured Pattern's underlying C-side codesize is
0 by the time split runs, tripping the assertion at sre.c:1094 and
SIGABRTing the gem.  Without the change the same call sequence runs
cleanly."
| mods urlsMod uri_to_iri result |
mods := importlib @env1:modules.
urlsMod := mods @env0:at: 'werkzeug.urls' ifAbsent: [nil].
urlsMod @env0:== nil ifTrue: [Transcript show: 'flask.urls not loaded'; cr. ExitClientError signal: 'no urls' status: 0].
uri_to_iri := urlsMod @env1:___pyAttrLoad___: #'uri_to_iri'.
[result := uri_to_iri @env1:value: { 'http://example.com/p%C3%A5th' } value: nil.
 Transcript show: 'uri_to_iri returned: ', result printString; cr]
  on: AbstractException do: [:ex |
    Transcript show: 'uri_to_iri raised: ', ex class name asString, ': ', ex messageText; cr].
%
level 0

logout
exit
