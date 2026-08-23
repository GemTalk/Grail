! ===============================================================================
! Repository Methods (GemStone repository administration for Python)
! ===============================================================================
! This file compiles env-1 INSTANCE methods onto the GemStone kernel class
! Repository so Python code can administer the repository through the gemdb
! module (src/python/stdlib/gemdb/admin.py):
!
!     import gemdb.admin
!     gemdb.admin.size()
!     gemdb.admin.backup("/path/to/backup.gz")
!     gemdb.admin.garbage_collect()
!
! `gemstone.repository` (gemstone.gs) returns SystemRepository; the attribute
! call then resolves through ___pyAttrLoad___'s instance branch to a
! BoundMethod and dispatches an env-1 method below.  These are deliberately
! INSTANCE methods on a kernel class, not methods on the gemstone module:
! a unary method on a module class is PERFORMED by a bare attribute read
! (the accessor protocol), so `dir(gemstone)` alone would start a
! mark-for-collection.  Instance attribute reads only wrap; nothing runs
! until the Python caller writes parentheses.
!
! Like System.gs, this file references no Python globals at compile time
! (it files in before they exist); Python exception classes are resolved
! through the symbol list at runtime.  It is filed with the kernel-class
! extensions: per-user as session methods by install_base40.gs on a modern
! kernel, or once per extent as SystemUser by install_base37.gs on a legacy
! kernel.
! ===============================================================================

! ------------------- Remove existing Python methods from Repository
expectvalue /Metaclass3
doit
Repository removeAllMethods: 1.
Repository class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Repository Administration'
method: Repository
file_size
	"Python repository.file_size() — the repository's total size in bytes
	(Repository >> fileSize: the sum of all extent sizes)."

	^ self @env0:fileSize
%

category: 'Grail-Repository Administration'
method: Repository
free_space
	"Python repository.free_space() — bytes of free space inside the
	repository's extents (Repository >> freeSpace)."

	^ self @env0:freeSpace
%

category: 'Grail-Repository Administration'
method: Repository
full_backup: aPath
	"Python repository.full_backup(path) — write a full backup.  A path
	ending in '.gz' gets a compressed backup (fullBackupGzCompressedTo:),
	anything else a plain one (fullBackupTo:) — the extension chooses the
	format, the way tarfile does.  Kernel failures (bad directory, no
	FileControl privilege, ...) are re-raised as Python OSError so the
	caller can except them; without the translation they tear through
	Python as uncatchable Smalltalk errors."

	| p n isGz |
	p := aPath @env0:asString.
	n := p @env0:size.
	isGz := false.
	(n @env0:>= 3) ifTrue: [
		isGz := (p @env0:copyFrom: (n @env0:- 2) to: n) @env0:= '.gz'].
	^ [ isGz
			ifTrue: [self @env0:fullBackupGzCompressedTo: p]
			ifFalse: [self @env0:fullBackupTo: p] ]
		@env0:on: Error do: [:ex | | osErr msg |
			msg := ex @env0:messageText.
			msg == nil ifTrue: [msg := ex @env0:asString].
			osErr := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'OSError'.
			osErr == nil ifTrue: [ex @env0:outer].
			osErr ___signal___: msg]
%

category: 'Grail-Repository Administration'
method: Repository
mark_for_collection
	"Python repository.mark_for_collection() — run the garbage-collection
	scan (Repository >> markForCollection) and return its report string.
	Long-running on a large repository; requires the GarbageCollection
	privilege and a session with no uncommitted changes (gemdb.admin
	checks that first, so the refusal is a Python exception with advice
	rather than a kernel error).  Kernel failures are re-raised as Python
	RuntimeError, same translation as full_backup:.

	The kernel RETURNS the report as a Warning object (measured on 4.0:
	'markForCollection found N live objects, M dead objects...'), so the
	text is unwrapped from its messageText rather than handed to Python
	as an opaque exception instance."

	| r |
	r := [self @env0:markForCollection]
		@env0:on: Error do: [:ex | | errCls msg |
			msg := ex @env0:messageText.
			msg == nil ifTrue: [msg := ex @env0:asString].
			errCls := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'RuntimeError'.
			errCls == nil ifTrue: [ex @env0:outer].
			errCls ___signal___: msg].
	(r @env0:isKindOf: AbstractException) ifTrue: [
		r := r @env0:messageText.
		r == nil ifTrue: [r := '']].
	^ r
%

set compile_env: 0
