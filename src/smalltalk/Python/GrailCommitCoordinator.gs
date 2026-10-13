! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- GrailCommitCoordinator class definition
expectvalue /Class
doit
Object subclass: 'GrailCommitCoordinator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailCommitCoordinator comment:
'Writes what Grail has noted for the next commit, as part of that commit,
whichever route the commit takes (#1466).

The kernel''s ``System class >> _commit:'''' hands the commit to the object
in ``System _commitCoordinator'''' (session state slot 14) when there is
one, instead of calling ``_localCommit:'''' itself; ``abort'''',
``beginTransaction'''' and ``transactionMode:'''' are routed the same way.
So does every commit there is: ``System commit'''' and
``commitTransaction'''', a GCI or topaz commit (``_gciCommit''''), gemdb,
and gemstone.system.commit().  The kernel''s own coordinator,
TransactionBoundaryDefaultPolicy, is the model: each message does its
``_local'''' counterpart, and commit: does Grail''s work first.

What it writes today is the self-send override record (object class >>
___grailRecordSelfSendOverride___:).  A store over a method name used to
write that record on the spot, so ``obj.m = wrapper'''' on an object
nobody commits made ``needsCommit'''' true.  Now the store only notes the
pair in session state, and a session that never commits writes nothing.

INSTALLED ON DEMAND, by the first note of a session (ensureInstalled), and
only into an empty slot: a session that already has a coordinator --
someone else''s -- keeps it, and the note is written immediately instead,
as before.  It is session state, so it ends with the session.'
%

expectvalue /Class
doit
GrailCommitCoordinator category: 'Grail-Persistence'
%

set compile_env: 0

expectvalue /Metaclass3
doit
GrailCommitCoordinator removeAllMethods.
GrailCommitCoordinator class removeAllMethods.
%

category: 'Grail-Installation'
classmethod: GrailCommitCoordinator
ensureInstalled
	"Make this session's commits go through a GrailCommitCoordinator, and
	answer whether they do.  False when another coordinator already holds
	the slot: it is left alone, and the caller writes its state immediately
	rather than waiting for a commit that would not flush it."

	| current |
	current := System _commitCoordinator.
	current == nil ifTrue: [
		System _commitCoordinator: self new.
		^ true].
	^ current isKindOf: self
%

category: 'Grail-Commit Coordinator'
method: GrailCommitCoordinator
commit: commitMode
	"Write what is pending, then commit.  The pending state is dropped only
	when the commit succeeds: after a failed commit the written entries are
	part of the failed transaction, and an abort takes them away, so they
	must be written again by the next attempt."

	| result |
	object ___grailFlushPendingSelfSendOverrides___.
	result := System _localCommit: commitMode.
	result == true ifTrue: [object ___grailForgetPendingSelfSendOverrides___].
	^ result
%

category: 'Grail-Commit Coordinator'
method: GrailCommitCoordinator
abort
	"Nothing pending is dropped: a transient object that carries an override
	survives the abort, and a later transaction may still commit it."

	^ System _localAbort
%

category: 'Grail-Commit Coordinator'
method: GrailCommitCoordinator
beginTransaction

	^ System _localBeginTransaction
%

category: 'Grail-Commit Coordinator'
method: GrailCommitCoordinator
transactionMode: newMode

	^ System _localTransactionMode: newMode
%
