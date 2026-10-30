! file tests/scripts/runRedeployRefusalSetup.gs -- run by run_redeploy_refusal_test.sh
!
! Deploys grail_redeploy_refusal_fixture with EmailMessage(Message), commits it,
! and then rewrites its source to the shape CPython's email.message has:
! Message <- MIMEPart <- EmailMessage.  The next import refuses the base change,
! and scripts/redeployModules.gs, finding nothing stored against the class,
! should rebuild it on its new bases (GemTalk/Grail#1985).
!
! Also checks the precondition that repair needs directly: a module body that
! raises, aborted in the handler as the redeploy does, leaves a clean session.
output pushnew runRedeployRefusalSetup.out
iferr 1 where
iferr 2 output pop
iferr 3 exit 1
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
| out failures check tmpDir path failPath write nm |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
write := [:p :src | | f |
  (GsFile existsOnServer: p) == true ifTrue: [GsFile removeServerFile: p].
  f := GsFile open: p mode: 'wb' onClient: false.
  f nextPutAll: src; close].
nm := 'grail_redeploy_refusal_fixture'.
tmpDir := importlib grailTmpDir.
path := tmpDir , '/' , nm , '.py'.
failPath := tmpDir , '/grail_redeploy_refusal_raises.py'.

System abortTransaction.
"Self-heal: an earlier run that died before its cleanup left the module deployed."
importlib ___forgetCanonicalModule___: nm.
importlib ___forgetCanonicalModule___: 'grail_redeploy_refusal_raises'.
System commit.
UserGlobals at: #'Grail_redeploy_refusal_snap' put: importlib ___canonicalRegistrySnapshot___.
System commit.

"1. A body that raises, aborted inside the handler -- before the stack unwinds,
as scripts/redeployModules.gs does.  What the body's unwinding runs must not
write: the redeploy asks for a clean transaction next, to count the instances
stored against a refused class, and a dirty one answers that it cannot count."
write value: failPath value: 'def f(a, b=1):
    return a


class C:
    x = 1


raise ImportError("raised by the fixture")
'.
[importlib loadModuleFromPath: failPath name: 'grail_redeploy_refusal_raises']
  on: Error , (System myUserProfile symbolList objectNamed: #BaseException)
  do: [:e | System abortTransaction. e return: nil].
check value: 'a body that raised and was aborted in its handler leaves nothing to commit'
  value: System needsCommit not.
System abortTransaction.

"2. Deploy the module as an older release shipped it."
write value: path value: 'def policy(name, strict=False):
    return name


class Message:
    def kind(self, prefix=""):
        return prefix + "message"


class EmailMessage(Message):
    pass
'.
importlib loadModuleFromPath: path name: nm.
System commit.
check value: 'the fixture is deployed'
  value: (importlib ___canonicalModules___ at: nm otherwise: nil) notNil.

"3. ...and the source a newer release ships: EmailMessage's base changed.  The
module is made stale as an install makes every deployed module stale: its
dependency record names an earlier runtime generation."
(importlib ___canonicalModuleDeps___ at: nm otherwise: nil) ifNotNil: [:rec | | stale |
  stale := rec copy.
  stale at: 3 put: (UserGlobals at: #'GrailRuntimeGeneration' otherwise: 0) - 1.
  importlib ___canonicalModuleDeps___ at: nm put: stale].
System commit.
SessionTemps current removeKey: #'GrailModuleCurrency' ifAbsent: [].
check value: 'the fixture is stale, as after an install'
  value: (importlib ___isCurrentModule___: nm) not.
"Message changes too, as it did between those releases: a body whose records
differ from the deployed ones has something to write when it ends."
write value: path value: 'def policy(name, strict=True):
    return name


class Message:
    def kind(self, prefix="", suffix=""):
        return prefix + "message" + suffix


class MIMEPart(Message):
    def kind(self, prefix=""):
        return prefix + "part"


class EmailMessage(MIMEPart):
    pass


KIND = EmailMessage().kind()
'.

failures isEmpty ifFalse: [
  ExitClientError signal: 'redeploy-refusal setup failed' status: 1].
%
logout
output pop
exit 0
