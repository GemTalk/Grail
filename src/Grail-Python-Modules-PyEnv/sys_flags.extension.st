Extension { #name : 'sys_flags' }

{ #category : 'Grail-Initialization' }
sys_flags >> initialize [
	"Populate the standard CPython interpreter flags, all 0 (a normal,
	non-optimized interpreter).  Attribute reads (sys.flags.optimize,
	sys.flags.debug, ...) resolve these via the dynamic-instVar store."

	#( #debug #inspect #interactive #optimize #dont_write_bytecode
	   #no_user_site #no_site #ignore_environment #verbose #bytes_warning
	   #quiet #hash_randomization #isolated #dev_mode #utf8_mode
	   #warn_default_encoding #safe_path
	   "3.14: context-local warning filters (PEP 793 groundwork) and whether a
	   new thread inherits the current context.  Both default to 0 in CPython
	   too, so the value is not a Grail compromise -- but the NAMES have to
	   exist, because _py_warnings reads context_aware_warnings at import."
	   #context_aware_warnings #thread_inherit_context ) @env0:do: [:f |
		self @env0:dynamicInstVarAt: f put: 0 ].
	"gil is 1 on a normal build; Grail has no free-threading mode."
	self @env0:dynamicInstVarAt: #gil put: 1.
	"int_max_str_digits: CPython's default cap (0 means ``no limit'')."
	self @env0:dynamicInstVarAt: #int_max_str_digits put: 4300

]
