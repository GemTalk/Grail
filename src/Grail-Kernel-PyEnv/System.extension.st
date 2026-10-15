Extension { #name : 'System' }

{ #category : 'Grail-Transaction Control' }
System class >> abort [
	"Python gemstone.system.abort() — abort the current GemStone
	transaction, discarding uncommitted changes."

	^ System @env0:abort

]

{ #category : 'Grail-Transaction Control' }
System class >> commit [
	"Python gemstone.system.commit() — commit the current GemStone
	transaction.  Returns True on success, False if the commit failed
	(e.g. due to a conflict).

	Flushes every loaded module's ``__persistent__''-listed globals into
	the committed store first (docs/Persistent_Modules_and_Classes.md
	par.6) — the developer's own commit boundary is the write-through
	point for persistent-name rebinds.  Resolved through the symbol list
	because this class files in before the Python globals exist.

	commitTransaction, NOT the kernel ``System commit'': the kernel
	convenience SIGNALS TransactionError on a conflict (measured on 4.0)
	instead of answering false, so the documented False-on-conflict
	contract above never held under a real write-write conflict — the
	Smalltalk error tore through Python instead.  gemdb's ConflictError
	handling (src/python/stdlib/gemdb/) depends on the Boolean."

	| imp obj |
	imp := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'importlib'.
	imp == nil ifFalse: [imp @env0:___flushPersistentState___].
	"The self-send override record waits for a commit (#1466).
	GrailCommitCoordinator writes it on every route; this covers a session
	where something replaced the coordinator.  Writing it twice is a no-op."
	obj := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'object'.
	obj == nil ifFalse: [obj @env0:___grailFlushPendingSelfSendOverrides___].
	^ System @env0:commitTransaction

]
