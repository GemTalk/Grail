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
!   instance store), check the patches work and that the patch wrote nothing
!   persistent -- not even the record of which names need a dispatcher, which
!   waits for a commit (#1466) -- then commit with a raw ``System commit'',
!   keeping the patched instance.
! Session B: fresh login -- builtins.len is the original, no patch machinery
!   is in any PERSISTENT method dictionary, a fresh instance runs the
!   original, and the COMMITTED instance's own self-send still reaches its
!   committed override: an override stored on an object that is committed is
!   data, and the session re-installs its dispatcher from the record.
!   That raw commit wrote the record (GrailCommitCoordinator), so B finds it.
!   A store on a throwaway instance of a class nobody recorded writes nothing
!   and leaves ``needsCommit'' as it was.
!   And wrapping a method of a FRESH instance with a function that calls its
!   saved bound method gives the wrapped answer on every instance (#1226):
!   the record installs the dispatcher before any handle is taken, and a
!   handle still has to run the class's function, not the instance's wrapper
!   that calls it again.
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
| out failures dir f mod before written result stray reg greeter recordWritten |
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

class Fresh:
    def m(self):
        return "m"

def throwaway():
    f = Fresh()
    f.m = lambda: "patched"
    return f.m()

def wrap_fresh():
    out = []
    for _ in (1, 2):
        g = Greeter()
        saved = g.word
        g.word = lambda saved=saved: "wrapped(" + saved() + ")"
        out.append(g.greet())
    return repr(out)
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
"A patch writes NOTHING persistent.  Not even the reduced-conflict record of
which (class, name) needed a dispatcher (object class >>
___grailCommittedSelfSendOverrides___): the store notes the pair in session
state and the commit writes it (#1466), so a session that never commits
stays clean."
reg := UserGlobals at: #'GrailCommittedSelfSendOverrides' ifAbsent: [nil].
greeter := mod @env1:___pyAttrLoad___: #Greeter.
recordWritten := written select: [:o | o == UserGlobals
  or: [reg ~~ nil and: [o == reg or: [reg values includesIdentical: o]]]].
recordWritten isEmpty ifFalse: [failures add: 'A: the patch wrote the override record before any commit (#1466)'].
(reg ~~ nil and: [(reg at: greeter ifAbsent: [#()]) includes: #word])
  ifTrue: [failures add: 'A: the record named Greeter before the commit (#1466)'].
stray := written reject: [:o |
  (o class name asString includesString: 'Rc') or: [o class name asString includesString: 'Bucket']].
out nextPutAll: 'sessionA: '; nextPutAll: (UserGlobals at: #'Grail_patch_result');
  nextPutAll: ', written: '; nextPutAll: (written collect: [:o | o class name]) asArray printString; cr.
((UserGlobals at: #'Grail_patch_result') = '((3, ''hello''), (42, ''patched'', ''hello''))')
  ifFalse: [failures add: 'A: both patches work, and the instance patch reaches only its instance'].
stray isEmpty ifFalse: [failures add: 'A: the patch wrote a persistent object: ' , (stray collect: [:o | o class name]) asArray printString].
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
| out failures b len cls probe wrapped reg fresh mod beforeW newW dirtyBefore thrown pending |
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
reg := UserGlobals at: #'GrailCommittedSelfSendOverrides' ifAbsent: [nil].
((reg ~~ nil and: [(reg at: cls ifAbsent: [#()]) includes: #word]))
  ifFalse: [failures add: 'B: session A''s raw System commit wrote the override record (#1466)'].
mod := UserGlobals at: #'Grail_patch_mod'.
fresh := mod @env1:___pyAttrLoad___: #Fresh.
dirtyBefore := System needsCommit.
beforeW := IdentitySet withAll: System _writtenObjects.
thrown := ((mod @env1:___pyAttrLoad___: #throwaway) @env1:___pyCallValue___: #() kw: nil) asString.
newW := System _writtenObjects reject: [:o | beforeW includes: o].
pending := SessionTemps current at: #'GrailPendingSelfSendOverrides' ifAbsent: [nil].
out nextPutAll: 'sessionB: a throwaway patch answers '; nextPutAll: thrown;
  nextPutAll: ', needsCommit '; nextPutAll: dirtyBefore printString; nextPutAll: ' -> ';
  nextPutAll: System needsCommit printString;
  nextPutAll: ', written: '; nextPutAll: (newW collect: [:o | o class name]) asArray printString; cr.
(thrown = 'patched') ifFalse: [failures add: 'B: the throwaway patch works'].
newW isEmpty ifFalse: [failures add: 'B: a store on a throwaway instance wrote a persistent object (#1466)'].
(System needsCommit == dirtyBefore) ifFalse: [failures add: 'B: a store on a throwaway instance changed needsCommit (#1466)'].
((reg ~~ nil and: [(reg at: fresh ifAbsent: [#()]) includes: #m]))
  ifTrue: [failures add: 'B: the record named the throwaway class before any commit (#1466)'].
((pending ~~ nil and: [(pending at: fresh ifAbsent: [#()]) includes: #m]))
  ifFalse: [failures add: 'B: the throwaway pair waits in session state for a commit'].
(System _commitCoordinator isKindOf: GrailCommitCoordinator)
  ifFalse: [failures add: 'B: the store installed GrailCommitCoordinator'].
"B's own cleanup commit below must not keep the throwaway pair."
object ___grailForgetPendingSelfSendOverrides___.
wrapped := [((UserGlobals at: #'Grail_patch_mod') @env1:___pyAttrLoad___: #wrap_fresh)
    @env1:___pyCallValue___: #() kw: nil]
  on: Error, BaseException do: [:e | e return: 'raised ' , e class name , ': ' , e messageText asString].
out nextPutAll: 'sessionB: wrapping two fresh instances: '; nextPutAll: wrapped asString; cr.
(wrapped asString = '[''wrapped(hello)'', ''wrapped(hello)'']')
  ifFalse: [failures add: 'B: a wrapper calling its saved bound method runs the class function on every instance (#1226)'].
(UserGlobals at: #'GrailCommittedSelfSendOverrides' ifAbsent: [nil])
  ifNotNil: [:r | r removeKey: cls ifAbsent: []. r removeKey: fresh ifAbsent: []].
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
