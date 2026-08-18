import warnings
NAMES = ['WarningMessage','_OptionError','_add_filter','_filters_mutated',
 '_filters_mutated_lock_held','_filters_version','_formatwarnmsg',
 '_formatwarnmsg_impl','_get_context','_get_filters','_getaction','_getcategory',
 '_lock','_set_context','_new_context','_setoption','_showwarnmsg',
 '_showwarnmsg_impl','_warnings_context','_acquire_lock','_release_lock',
 '_set_module','_use_context','_deprecated','defaultaction','filters',
 'filterwarnings','formatwarning','onceregistry','showwarning','simplefilter',
 'warn','warn_explicit','catch_warnings','resetwarnings','deprecated','__all__']
HAVE = []
MISS = []
for n in NAMES:
    (HAVE if hasattr(warnings, n) else MISS).append(n)
R = {'have': ' '.join(HAVE), 'miss': ' '.join(MISS)}
