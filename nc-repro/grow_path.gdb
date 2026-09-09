# Instrument methodLookupCacheAtPut's grow path on a RELEASE 4.0 build.
# libgcilnk ships with debug_info, so no assert build is needed.
#
#   gdb -q -batch -x grow_path.gdb --args topaz -l -I .topazini -S /tmp/v3.tpz
#
# Prints, for every cache grow, the dictionary the re-insert actually targets
# and the value it writes.  A grow of the understands cache (cwo=1) whose
# target is a dictionary otherwise only ever used with cwo=0 is the bug.
#
# Line numbers in the shipped debug info map 1:1 onto src/ommethlookup.m4.
# class_lookup_cache_ofs == 0 (dispatch), class_understands_cache_ofs == 1.
set pagination off
set height 0
set confirm off
set breakpoint pending on

# stop once so the shared library is loaded and symbols relocate
break ommethlookup.c:290
run
delete 1

set $fn = (char*)&_ZN2om22methodLookupCacheAtPutEPS_PP10omObjSTypemS3_i
# +489 is the return address of the grow-path KeyValueDictMethDictAtPut call.
# Verify after a build change: it is the call site hit exactly once per grow.
set $growret = $fn + 489
printf "methodLookupCacheAtPut=%p growret=%p\n", $fn, $growret

# every put: which cache offset (m4:290, the collision check)
break ommethlookup.c:290
commands
  silent
  printf "PUT cwo=%d\n", cacheWordOfs
  continue
end

# every grow (m4:304)
break ommethlookup.c:304
commands
  silent
  printf "GROW cwo=%d\n", cacheWordOfs
  continue
end

# the grow's re-insert: rsi=cacheH, rdx=keyH, rcx=valH
break KeyValueDictMethDictAtPut if *(void**)$rsp == $growret
commands
  silent
  printf "GROWINSERT dict=%p val=%p\n", *(void**)$rsi, *(void**)$rcx
  continue
end

continue
printf "=== FAULT ===\n"
printf "rip=%p rax=%p rip_minus_rax=%ld\n", $rip, $rax, (long)$rip - (long)$rax
printf "compare rip against the GROWINSERT val values above\n"
quit
