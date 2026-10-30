! file tests/scripts/runRedeployRefusalVerify.gs -- run by run_redeploy_refusal_test.sh
!
! After scripts/redeployModules.gs: in a fresh session, the deployed fixture's
! EmailMessage is on its new base and the module binds warm, with nothing to
! commit.  Then removes what runRedeployRefusalSetup.gs deployed.
output pushnew runRedeployRefusalVerify.out
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
| out failures check nm path cls mod |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
nm := 'grail_redeploy_refusal_fixture'.
path := importlib grailTmpDir , '/' , nm , '.py'.
[cls := importlib ___canonicalClassRegistry___ at: nm , '.EmailMessage' otherwise: nil.
 check value: 'the redeploy rebuilt EmailMessage on its new base, MIMEPart'
   value: ((cls isKindOf: Behavior) and: [cls superclass name asString = 'MIMEPart']).
 check value: 'the rebuilt module is current'
   value: (importlib ___isCurrentModule___: nm).
 mod := [importlib loadModuleFromPath: path name: nm]
   on: Error , (System myUserProfile symbolList objectNamed: #BaseException)
   do: [:e | out nextPutAll: '  (import: ' , (e messageText ifNil: [e class name]) asString , ')'; cr. e return: nil].
 check value: 'and binds warm, with nothing to commit'
   value: (mod notNil and: [System needsCommit not]).
 check value: 'and runs the new source'
   value: (mod notNil and: [(mod @env1:KIND) = 'part'])]
  ensure: [
    System abortTransaction.
    importlib ___canonicalRegistryRestore___:
      (UserGlobals at: #'Grail_redeploy_refusal_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
    UserGlobals removeKey: #'Grail_redeploy_refusal_snap' ifAbsent: [].
    importlib ___forgetCanonicalModule___: nm.
    importlib ___forgetCanonicalModule___: 'grail_redeploy_refusal_raises'.
    System commit].
failures isEmpty ifFalse: [
  ExitClientError signal: 'redeploy-refusal verify failed' status: 1].
%
logout
output pop
exit 0
