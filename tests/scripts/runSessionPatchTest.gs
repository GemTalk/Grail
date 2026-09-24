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
!   instance store), check the patches work and that nothing persistent was
!   written but the committed record of which names need a dispatcher, then
!   commit -- keeping the patched instance.
! Session B: fresh login -- builtins.len is the original, no patch machinery
!   is in any PERSISTENT method dictionary, a fresh instance runs the
!   original, and the COMMITTED instance's own self-send still reaches its
!   committed override: an override stored on an object that is committed is
!   data, and the session re-installs its dispatcher from the record.
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
| out failures dir f mod before written result allowed stray |
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

KEPT = []

def patch():
    g = Greeter()
    before = (len("abc"), g.greet())
    builtins.len = lambda x: 42
    g.word = lambda: "patched"
    after = (len("abc"), g.greet(), Greeter().greet())
    KEPT.append(g)
    return repr((before, after))

def probe(g):
    return repr((g.greet(), Greeter().greet()))
'.
f close.
UserGlobals at: #'Grail_patch_dir' put: dir.
mod := importlib loadModuleFromPath: dir , '/grail_session_patch.py' name: 'grail_session_patch'.
"Everything above wrote (a cold import compiles); only the patch is measured."
before := IdentitySet withAll: System _writtenObjects.
result := ((mod @env1:___pyAttrLoad___: #patch) @env1:___pyCallValue___: #() kw: nil) asString.
written := System _writtenObjects reject: [:o | before includes: o].
"Stored only now: a UserGlobals write inside the window is a write too."
UserGlobals at: #'Grail_patch_result' put: result.
"The ONE thing a patch may write: the reduced-conflict record of which
(class, name) needed a dispatcher (object class >>
___grailCommittedSelfSendOverrides___), and UserGlobals when it creates it."
allowed := IdentitySet new.
allowed add: UserGlobals.
(UserGlobals at: #'GrailCommittedSelfSendOverrides' ifAbsent: [nil]) ifNotNil: [:reg |
  allowed add: reg.
  reg valuesDo: [:bag | allowed add: bag]].
stray := written reject: [:o | (allowed includes: o)
  or: [(o class name asString includesString: 'Rc') or: [o class name asString includesString: 'Bucket']]].
out nextPutAll: 'sessionA: '; nextPutAll: (UserGlobals at: #'Grail_patch_result');
  nextPutAll: ', written: '; nextPutAll: (written collect: [:o | o class name]) asArray printString; cr.
((UserGlobals at: #'Grail_patch_result') = '((3, ''hello''), (42, ''patched'', ''hello''))')
  ifFalse: [failures add: 'A: both patches work, and the instance patch reaches only its instance'].
stray isEmpty ifFalse: [failures add: 'A: the patch wrote more than the override record: ' , (stray collect: [:o | o class name]) asArray printString].
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
| out failures b len cls probe |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_patch_failures' ifAbsent: [#('session A recorded nothing')]).
b := (Python at: #builtins) ___instance___.
len := b @env1:len: 'abc'.
(len = 3) ifFalse: [failures add: 'B: builtins.len is the original again (' , len printString , ')'].
(((b class persistentMethodDictForEnv: 1) includesKey: #'___grailOrig_len:') not)
  ifFalse: [failures add: 'B: no builtins forwarder shadow was committed'].
cls := (UserGlobals at: #'Grail_patch_mod') @env1:___pyAttrLoad___: #Greeter.
(((cls persistentMethodDictForEnv: 1) includesKey: #'___grailOrig_word') not)
  ifFalse: [failures add: 'B: no self-send dispatcher shadow was committed'].
probe := ((UserGlobals at: #'Grail_patch_mod') @env1:___pyAttrLoad___: #probe)
  @env1:___pyCallValue___: { ((UserGlobals at: #'Grail_patch_mod') @env1:___pyAttrLoad___: #KEPT) @env1:__getitem__: 0 } kw: nil.
out nextPutAll: 'sessionB: committed instance and a fresh one greet: '; nextPutAll: probe asString; cr.
(probe asString = '(''patched'', ''hello'')')
  ifFalse: [failures add: 'B: the committed override reaches its own self-send, and only its own'].
(UserGlobals at: #'GrailCommittedSelfSendOverrides' ifAbsent: [nil])
  ifNotNil: [:reg | reg removeKey: cls ifAbsent: []].
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
