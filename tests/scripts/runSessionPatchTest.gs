output pushnew runSessionPatchTest.out
! file tests/scripts/runSessionPatchTest.gs
!
! A monkey-patch belongs to the session that made it.
!
! Patching a method-backed name installs a dispatcher (a self-send's route to
! an instance override) or a builtins forwarder (a bare ``open(...)'''s route
! to ``builtins.open = f'').  Both used to be compiled PERSISTENTLY, so a
! patch wrote the class's method and category dictionaries: a session that
! committed kept the patch machinery for every later session, and two
! sessions patching one class conflicted at commit.  They are now TRANSIENT
! session methods (Behavior >> ___compileSessionMethod:category:), which only
! a real commit / logout / login boundary can show -- the SUnit suite must not
! commit.
!
! Session A: patch builtins.len and a Python class's method (both through an
!   instance store), check the patches work and that NO persistent object was
!   modified, commit.
! Session B: fresh login -- both names are the originals again, with no
!   dispatcher or forwarder left behind.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

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
| out failures dir f mod before modified result |
out := GsFile stdout.
failures := OrderedCollection new.
dir := importlib grailDir , '/out/session_patch'.
(GsFile existsOnServer: dir) == true ifFalse: [GsFile createServerDirectory: dir].
f := GsFile openWriteOnServer: dir , '/grail_session_patch.py'.
f nextPutAll:
'import builtins

class Greeter:
    def word(self):
        return "hello"
    def greet(self):
        return self.word()

def patch():
    g = Greeter()
    before = (len("abc"), g.greet())
    builtins.len = lambda x: 42
    g.word = lambda: "patched"
    after = (len("abc"), g.greet(), Greeter().greet())
    return repr((before, after))
'.
f close.
UserGlobals at: #'Grail_patch_dir' put: dir.
mod := importlib loadModuleFromPath: dir , '/grail_session_patch.py' name: 'grail_session_patch'.
"Everything above wrote (a cold import compiles); only the patch is measured."
before := System _numPersistentObjsModified.
result := ((mod @env1:___pyAttrLoad___: #patch) @env1:___pyCallValue___: #() kw: nil) asString.
modified := System _numPersistentObjsModified - before.
"Stored only now: a UserGlobals write inside the window is a write too."
UserGlobals at: #'Grail_patch_result' put: result.
out nextPutAll: 'sessionA: '; nextPutAll: (UserGlobals at: #'Grail_patch_result'); nextPutAll: ', persistent objects modified by the patch: '; nextPutAll: modified printString; cr.
((UserGlobals at: #'Grail_patch_result') = '((3, ''hello''), (42, ''patched'', ''hello''))')
  ifFalse: [failures add: 'A: both patches work, and the instance patch reaches only its instance'].
(modified = 0) ifFalse: [failures add: 'A: the patch modified ' , modified printString , ' persistent objects'].
UserGlobals at: #'Grail_patch_mod' put: mod.
UserGlobals at: #'Grail_patch_failures' put: failures asArray.
System commit.
%
logout

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
| out failures b len cls |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_patch_failures' ifAbsent: [#('session A recorded nothing')]).
b := (Python at: #builtins) ___instance___.
len := b @env1:len: 'abc'.
(len = 3) ifFalse: [failures add: 'B: builtins.len is the original again (' , len printString , ')'].
((b class whichClassIncludesSelector: #'___grailOrig_len:' environmentId: 1) isNil)
  ifFalse: [failures add: 'B: no builtins forwarder shadow survived the commit'].
cls := (UserGlobals at: #'Grail_patch_mod') @env1:___pyAttrLoad___: #Greeter.
(((cls @env1:value: #() value: nil) @env1:greet) = 'hello')
  ifFalse: [failures add: 'B: a fresh instance greets with the original method'].
((cls whichClassIncludesSelector: #'___grailOrig_word' environmentId: 1) isNil)
  ifFalse: [failures add: 'B: no self-send dispatcher shadow survived the commit'].
GsFile removeServerFile: (UserGlobals at: #'Grail_patch_dir') , '/grail_session_patch.py'.
importlib ___forgetCanonicalModule___: 'grail_session_patch'.
#(#'Grail_patch_dir' #'Grail_patch_result' #'Grail_patch_mod' #'Grail_patch_failures') do: [:k |
  UserGlobals removeKey: k ifAbsent: []].
System commit.
out nextPutAll: 'sessionB: len(''abc'') = '; nextPutAll: len printString; cr; cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Session patch: all checks passed.'; cr.
    ExitClientError signal: 'Session patch passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Session patch FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Session patch failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
