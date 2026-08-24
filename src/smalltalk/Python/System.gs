! ===============================================================================
! System Methods (GemStone transaction control for Python)
! ===============================================================================
! This file compiles env-1 class-side methods onto the GemStone kernel
! class System so Python code can drive transaction control through the
! gemstone module:
!
!     import gemstone
!     gemstone.system.commit()
!     gemstone.system.abort()
!
! `gemstone.system` (gemstone.gs) returns the System class itself; the
! attribute call then resolves through ___pyAttrLoad___'s class-receiver
! branch to a BoundMethod wrapping (System, #commit) and dispatches the
! env-1 unary method below.
!
! System lives in the SystemUser-owned security policy, so this file must
! be loaded in install.gs's SystemUser section (alongside str.gs etc.).
! ===============================================================================

! ------------------- Remove existing Python methods from System
expectvalue /Metaclass3
doit
System removeAllMethods: 1.
System class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Transaction Control'
classmethod: System
abort
	"Python gemstone.system.abort() — abort the current GemStone
	transaction, discarding uncommitted changes."

	^ System @env0:abort
%

category: 'Grail-Transaction Control'
classmethod: System
commit
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
	handling (src/python/stdlib/gemdb.py) depends on the Boolean."

	| imp |
	imp := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'importlib'.
	imp == nil ifFalse: [
		"Put back any module the session is using that the repository lost to
		an earlier abort, BEFORE persisting anything that may point at its
		classes -- otherwise this commit writes instances of a class nothing
		names.  See importlib >> ___reinstateSessionModules___.

		respondsTo:, because on a LEGACY kernel (3.7) this method is filed
		SHARED by install_base.sh as SystemUser, while importlib is PER USER
		(install.sh).  So one stone can hold a System newer than some user's
		Grail, and an unguarded send would turn every commit that user makes
		into a doesNotUnderstand.  Skipping the repair is the right
		degradation: it only ever puts back what an abort removed."
		(imp @env0:respondsTo: #'___reinstateSessionModules___')
			ifTrue: [imp @env0:___reinstateSessionModules___].
		imp @env0:___flushPersistentState___].
	^ System @env0:commitTransaction
%

set compile_env: 0
