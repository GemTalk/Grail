"
sys.flags: the interpreter's command-line flags, a struct sequence (Python/sysmodule.c).
It replaces the native module sys_flags, which stays in place unused: a database holds a
committed instance of that SymbolDictionary class, and Rowan cannot migrate one to a tuple.
"
Class {
	#name : 'PySysFlags',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
PySysFlags class >> ___namedOnlyFields___ [
	^ #(#'gil' #'thread_inherit_context' #'context_aware_warnings')

]

{ #category : 'Grail-Fields' }
PySysFlags class >> ___sequenceNames___ [
	^ #(#'debug' #'inspect' #'interactive' #'optimize' #'dont_write_bytecode' #'no_user_site' #'no_site' #'ignore_environment' #'verbose' #'bytes_warning' #'quiet' #'hash_randomization' #'isolated' #'dev_mode' #'utf8_mode' #'warn_default_encoding' #'safe_path' #'int_max_str_digits')

]

{ #category : 'Grail-Fields' }
PySysFlags class >> ___sysInstance___ [
	"A normal, non-optimized interpreter: every flag 0, dev_mode and safe_path
	False (CPython's are bools), the default int_max_str_digits, and gil 1 --
	Grail has no free-threading mode."

	^ self
		___sequence___: { 0. 0. 0. 0. 0. 0. 0. 0. 0. 0. 0. 0. 0. false. 0. 0. false. 4300. 1. 0. 0 }
		named: nil

]

{ #category : 'Grail-Fields' }
PySysFlags class >> ___typeName___ [
	^ 'sys.flags'

]
