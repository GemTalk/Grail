output pushnew runFunctionDefaultsBindTest.out
! file tests/scripts/runFunctionDefaultsBindTest.gs
!
! A deployed module's functions keep their defaults in a session that BINDS it
! (#1717).
!
! The module body registers each function's defaults block, and replays a
! ``__defaults__'' / ``__kwdefaults__'' assignment, in session-local tables.
! A warm bind does not run the body, so in every later session the reads
! answered None and an assignment the body made was lost: a same-shape one
! bound the def-time value, a shape-changing one left the call short an
! argument.
!
!   grail_fndefaults_mod.py
!     h(a, b=3, *, k=4)                     plain defaults
!     g(a, b=1);  g.__defaults__ = (5,)     same-shape assignment
!     f(a, b);    f.__defaults__ = (2,)     shape-changing assignment (#1714)
!     k(a, *, c=1);  k.__kwdefaults__ = {"c": 7}
!
! Session A: write the module, import it cold, commit.
! Session B: fresh.  The warm bind answers CPython's values for every call and
!   every read, a same-shape write in this session takes effect, and nothing
!   is left to commit.
! Session C: cleanup (registry snapshot restore, files), report the verdict.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- write the module, import it cold, commit
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out dir file mod failures |
out := GsFile stdout.
failures := OrderedCollection new.
"SELF-HEAL: a run that stopped before session C leaves its deployment behind."
importlib ___forgetCanonicalModule___: 'grail_fndefaults_mod'.
importlib removeModule: 'grail_fndefaults_mod'.
System commit.
UserGlobals at: #'Grail_fndefaults_snap' put: importlib ___canonicalRegistrySnapshot___.
dir := importlib grailDir , '/out/function_defaults_bind'.
{ importlib grailDir , '/out' . dir } do: [:each |
  (GsFile existsOnServer: each) == true ifFalse: [GsFile createServerDirectory: each]].
UserGlobals at: #'Grail_fndefaults_dir' put: dir.
file := GsFile openWriteOnServer: dir , '/grail_fndefaults_mod.py'.
file nextPutAll: 'def h(a, b=3, *, k=4):
    return (a, b, k)


def g(a, b=1):
    return (a, b)


g.__defaults__ = (5,)


def f(a, b):
    return (a, b)


f.__defaults__ = (2,)


def k(a, *, c=1):
    return (a, c)


k.__kwdefaults__ = {"c": 7}
'.
file close.
importlib @env1:addSearchRoot: dir.
mod := importlib loadModuleFromPath: dir , '/grail_fndefaults_mod.py' name: 'grail_fndefaults_mod'.
(((PythonTestCase new) eval: 'import grail_fndefaults_mod as m
repr((m.h(1), m.g(1), m.f(1), m.k(1)))') = '((1, 3, 4), (1, 5), (1, 2), (1, 7))')
  ifFalse: [failures add: 'A: the cold import answers CPython''s calls'].
UserGlobals at: #'Grail_fndefaults_mod' put: mod.
UserGlobals at: #'Grail_fndefaults_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: deployed grail_fndefaults_mod'; cr.
%
logout

! ===========================================================================
! Session B -- the warm bind keeps every default
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out failures check answers dir mod |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_fndefaults_failures').
answers := [:label :source :expected | | actual |
  actual := [(PythonTestCase new) eval: 'import grail_fndefaults_mod as m
' , source]
    on: AbstractException do: [:exception | exception return: 'raised ' , exception messageText asString].
  actual = expected ifFalse: [
    failures add: label , ': expected ' , expected , ', got ' , actual printString]].
check := [:label :condition | condition ifFalse: [failures add: label]].
[
  dir := UserGlobals at: #'Grail_fndefaults_dir'.
  importlib @env1:addSearchRoot: dir.
  check value: 'B: a fresh session starts with nothing to commit' value: System needsCommit not.
  mod := importlib loadModuleFromPath: dir , '/grail_fndefaults_mod.py' name: 'grail_fndefaults_mod'.
  check value: 'B: the module bound warm' value: mod == (UserGlobals at: #'Grail_fndefaults_mod').
  answers value: 'B: plain defaults: the call, __defaults__, __kwdefaults__'
    value: 'repr((m.h(1), m.h.__defaults__, m.h.__kwdefaults__))'
    value: '((1, 3, 4), (3,), {''k'': 4})'.
  answers value: 'B: a same-shape __defaults__ assignment in the body'
    value: 'repr((m.g(1), m.g.__defaults__))'
    value: '((1, 5), (5,))'.
  answers value: 'B: a shape-changing __defaults__ assignment in the body (#1714)'
    value: 'repr((m.f(1), m.f.__defaults__))'
    value: '((1, 2), (2,))'.
  answers value: 'B: a __kwdefaults__ assignment in the body'
    value: 'repr((m.k(1), m.k.__kwdefaults__))'
    value: '((1, 7), {''c'': 7})'.
  check value: 'B: binding the module and reading its defaults left nothing to commit'
    value: System needsCommit not.
  answers value: 'B: a same-shape write in this session takes effect'
    value: 'm.h.__defaults__ = (9,)
repr((m.h(1), m.h.__defaults__))'
    value: '((1, 9, 4), (9,))'.
  check value: 'B: and leaves nothing to commit' value: System needsCommit not.
] on: AbstractException do: [:exception |
  failures add: 'B: raised ' , exception class name asString , ': ' ,
    ((exception messageText ifNil: ['']) asString copyFrom: 1
      to: (((exception messageText ifNil: ['']) asString size) min: 100)).
  exception return: nil].
System abort.
UserGlobals at: #'Grail_fndefaults_failures' put: failures asArray.
System commit.
failures do: [:each | out nextPutAll: 'FAIL '; nextPutAll: each; cr].
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then the verdict
! ===========================================================================
login
run
| out failures dir |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_fndefaults_failures' ifAbsent: [#('C: no verdict recorded')].
System abort.
importlib ___forgetCanonicalModule___: 'grail_fndefaults_mod'.
importlib removeModule: 'grail_fndefaults_mod'.
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_fndefaults_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
dir := UserGlobals at: #'Grail_fndefaults_dir' ifAbsent: [nil].
dir ifNotNil: [
  (GsFile existsOnServer: dir , '/grail_fndefaults_mod.py') == true
    ifTrue: [GsFile removeServerFile: dir , '/grail_fndefaults_mod.py']].
#(#'Grail_fndefaults_snap' #'Grail_fndefaults_dir' #'Grail_fndefaults_mod'
  #'Grail_fndefaults_failures' #'GrailPersistentModuleState') do: [:key |
    UserGlobals removeKey: key ifAbsent: []].
System commit.
failures isEmpty
  ifTrue: [ExitClientError signal: 'function defaults bind: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'function defaults bind had '; print: failures size;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'function defaults bind FAILED!' status: 1].
%
logout
