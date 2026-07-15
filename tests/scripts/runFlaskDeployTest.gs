output pushnew runFlaskDeployTest.out
! file tests/scripts/runFlaskDeployTest.gs
!
! REAL-APPLICATION acceptance for canonical modules (docs/
! Persistent_Modules_and_Classes.md par.10): deploy a Flask app --
! session A cold-imports a fixture whose MODULE BODY builds the app and
! its routes (pulling in the whole flask / werkzeug / jinja2 /
! itsdangerous closure), then commits; session B warm-BINDS the
! committed module instance (no body re-run anywhere in the closure)
! and the SAME app object must serve requests through the full WSGI
! entry point: routing, request context (werkzeug context locals living
! in committed module instances), view dispatch, Response
! materialisation, jsonify.  This is the customer-shaped test that the
! par.10.6 fixture approximates with @dataclass/@global_enum.
!
! Session C removes everything session A's commit swept (registry keys
! + PythonModules snapshot-diff), leaving the repository clean.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- flag on, cold import (builds the whole closure), commit
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
| out mod r |
out := GsFile stdout.
(importlib ___canonicalClassesEnabled___)
  ifTrue: [^ self error: 'setup: canonical-classes flag must default to OFF'].

"Snapshot the canonical registries + PythonModules BEFORE any import so
session C removes exactly what this test's deploy adds -- a standing
framework deployment (from scripts/deployFrameworks.gs) survives."
UserGlobals at: #'Grail_flask_snap' put: importlib ___canonicalRegistrySnapshot___.

importlib ___canonicalClassesEnabled___: true.
mod := importlib
  loadModuleFromPath: (importlib grailDir , '/tests/python/grail_flask_deploy_fixture.py')
  name: 'grail_flask_deploy_fixture'.

"Cold sanity before committing: the module-level app served during the
body run, and serves again post-import."
((mod @env1:boot_status) = '200 OK')
  ifFalse: [^ self error: 'setup: cold boot serve failed: ' , (mod @env1:boot_status) printString].
r := mod @env1:serve: '/'.
((r @env1:__getitem__: 1) = 'Hello, deployed Grail!')
  ifFalse: [^ self error: 'setup: cold serve body: ' , (r @env1:__getitem__: 1) printString].
r := mod @env1:serve: '/add/2/3'.
(((r @env1:__getitem__: 0) = '200 OK') and: [((r @env1:__getitem__: 1) includesString: '5')])
  ifFalse: [^ self error: 'setup: cold JSON route: ' , (r @env1:__getitem__: 1) printString].

UserGlobals at: #'Grail_flask_module' put: mod.
System commit.
out cr; nextPutAll: 'sessionA: Flask app + closure deployed (committed)'; cr.
%
logout

! ===========================================================================
! Session B -- fresh login, warm-BIND, the committed app must serve
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
| out results failures check mod committedMod r |
out := GsFile stdout.
results := OrderedCollection new.
failures := OrderedCollection new.
check := [:label :bool | bool ifTrue: [results add: label] ifFalse: [failures add: label]].

[
  importlib ___canonicalClassesEnabled___: true.
  committedMod := UserGlobals at: #'Grail_flask_module'.

  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/grail_flask_deploy_fixture.py')
    name: 'grail_flask_deploy_fixture'.
  check value: 'WARM BIND: import returned the committed fixture module (identity)'
    value: (mod == committedMod).

  "The committed app -- built once at deploy time -- serves a request in
  THIS session: routing, request context, view dispatch, Response."
  r := mod @env1:serve: '/'.
  check value: 'deployed app serves / (200 OK)'
    value: ((r @env1:__getitem__: 0) = '200 OK').
  check value: 'deployed app serves / body'
    value: ((r @env1:__getitem__: 1) = 'Hello, deployed Grail!').

  "Dynamic URL converter + jsonify through the committed closure."
  r := mod @env1:serve: '/add/20/22'.
  check value: 'deployed app serves /add/20/22 (200 OK)'
    value: ((r @env1:__getitem__: 0) = '200 OK').
  check value: 'deployed app jsonify total = 42'
    value: ((r @env1:__getitem__: 1) includesString: '42').

  "404 error path exercises werkzeug exception machinery post-bind."
  r := mod @env1:serve: '/no/such/route'.
  check value: 'deployed app 404s an unknown route'
    value: ((r @env1:__getitem__: 0) = '404 NOT FOUND').

  "Serve twice more: context locals push/pop stay balanced across
  requests on the committed werkzeug/flask module instances."
  r := mod @env1:serve: '/'.
  check value: 'second request on the bound app still serves'
    value: ((r @env1:__getitem__: 0) = '200 OK').
  r := mod @env1:serve: '/add/1/1'.
  check value: 'third request (JSON) still serves'
    value: ((r @env1:__getitem__: 1) includesString: '2').
] on: AbstractException do: [:e |
  failures add: 'UNEXPECTED ERROR: ' , e messageText printString.
  e return: nil].

out cr; cr.
failures isEmpty
  ifTrue: [out nextPutAll: 'Flask deploy acceptance: all checks passed.'; cr]
  ifFalse: [
    out nextPutAll: 'Flask deploy acceptance FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
UserGlobals at: #'Grail_flask_failures' put: failures size.
System commit.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then report the recorded verdict
! ===========================================================================
login
run
| out failCount |
out := GsFile stdout.
failCount := UserGlobals at: #'Grail_flask_failures' ifAbsent: [999].

"Surgical cleanup: restore the registries + PythonModules to session A's
pre-import snapshot, leaving any standing framework deployment intact."
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_flask_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
UserGlobals removeKey: #'Grail_flask_snap' ifAbsent: [].
UserGlobals removeKey: #'Grail_flask_module' ifAbsent: [].
UserGlobals removeKey: #'Grail_flask_failures' ifAbsent: [].
UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
System commit.

failCount = 0
  ifTrue: [ExitClientError signal: 'Flask deploy acceptance passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Flask deploy acceptance had '; print: failCount;
      nextPutAll: ' failure(s) -- see session B output above.'; cr.
    ExitClientError signal: 'Flask deploy acceptance failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
