<?php $assetRoot = $assetRoot ?? '..'; ?>
<div class="toast-stack" id="toastStack" aria-live="polite"></div>
<script src="<?php echo $assetRoot; ?>/js/event-center.js" defer></script>
<script src="<?php echo $assetRoot; ?>/js/toast-notifications.js" defer></script>
<script src="<?php echo $assetRoot; ?>/js/loading-overlay.js" defer></script>
<script src="<?php echo $assetRoot; ?>/js/logout-confirmation.js" defer></script>
<script src="<?php echo $assetRoot; ?>/js/dashboard-action-notifications.js" defer></script>
<?php foreach ($extraScripts ?? [] as $src): ?>
<script src="<?php echo htmlspecialchars($src, ENT_QUOTES, 'UTF-8'); ?>" defer></script>
<?php endforeach; ?>
</body>

</html>
