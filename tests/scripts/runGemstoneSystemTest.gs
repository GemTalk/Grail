output pushnew runGemstoneSystemTest.out
! file tests/scripts/runGemstoneSystemTest.gs
!
! Functional test for gemstone.system.commit() / gemstone.system.abort()
! (env-1 class-side methods on System, installed by System.gs and reached
! from Python through the gemstone module's `system` attribute).
!
! This cannot be an SUnit test: SUnit runs in a single session and must not
! commit or abort (an abort would discard the suite's accumulated uncommitted
! state; a commit would make test artifacts permanent).  This script models
! the real lifecycle instead -- session 1 stores a value through the gemstone
! module and commits via gemstone.system.commit(); session 2 (a fresh view)
! verifies the value persisted, overwrites it WITHOUT committing, discards
! the change via gemstone.system.abort(), verifies the committed value came
! back, then removes the key and commits to leave the repository clean.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- store via gemstone[...], commit via gemstone.system.commit()
! ===========================================================================
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 0
run
| out evalPython result |
"Session-local stdout -- never the global Transcript (this script commits)."
out := GsFile stdout.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].

result := evalPython value: '
import gemstone
gemstone["_Grail_system_test"] = "committed"
gemstone.system.commit()
'.
result == true ifFalse: [^ self error: 'session1: gemstone.system.commit() did not return True'].
(UserGlobals at: #'_Grail_system_test' ifAbsent: [nil]) = 'committed'
  ifFalse: [^ self error: 'session1: committed value not visible in UserGlobals'].
out cr; nextPutAll: 'session1: gemstone.system.commit() returned True'; cr.
%
logout

! ===========================================================================
! Session 2 -- fresh view sees the commit; abort discards an uncommitted
!              overwrite; clean up.
! ===========================================================================
login
run
| out evalPython failures check |
out := GsFile stdout.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out cr; nextPutAll: '  PASS  ', label]
    ifFalse: [failures add: label. out cr; nextPutAll: '  FAIL  ', label]].

"Run the assertions inside ensure: so the committed key is always removed,
leaving the repository pristine in every case."
[
  check value: 'commit persisted across sessions'
    value: (UserGlobals at: #'_Grail_system_test' ifAbsent: [nil]) = 'committed'.

  "Overwrite without committing, then discard via gemstone.system.abort()."
  evalPython value: '
import gemstone
gemstone["_Grail_system_test"] = "uncommitted"
'.
  check value: 'uncommitted overwrite visible in this session'
    value: (UserGlobals at: #'_Grail_system_test' ifAbsent: [nil]) = 'uncommitted'.

  evalPython value: '
import gemstone
gemstone.system.abort()
'.
  check value: 'abort discarded the uncommitted overwrite'
    value: (UserGlobals at: #'_Grail_system_test' ifAbsent: [nil]) = 'committed'.

  "Interop attributes work end-to-end in a committed image."
  check value: 'gemstone.system is System'
    value: (evalPython value: '
import gemstone
gemstone.system
') == System.
  check value: 'gemstone.mySymbolList[0] is the first SymbolDictionary'
    value: (evalPython value: '
import gemstone
gemstone.mySymbolList[0]
') == (GsCurrentSession currentSession symbolList at: 1).
] ensure: [
  UserGlobals removeKey: #'_Grail_system_test' ifAbsent: [].
  System commitTransaction
].

out cr; cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'gemstone.system commit/abort test: all checks passed.'; cr.
    ExitClientError signal: 'gemstone.system test passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'gemstone.system commit/abort test FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'gemstone.system test failed!' status: 1].
%
logout
exit
