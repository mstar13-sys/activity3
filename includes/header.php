<?php
$pageTitle = $pageTitle ?? 'SmartCare';
$assetRoot = $assetRoot ?? '..';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo htmlspecialchars($pageTitle); ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="<?php echo $assetRoot; ?>/css/variables.css" />
    <link rel="stylesheet" href="<?php echo $assetRoot; ?>/css/base.css" />
    <link rel="stylesheet" href="<?php echo $assetRoot; ?>/css/layout.css" />
    <link rel="stylesheet" href="<?php echo $assetRoot; ?>/css/components.css" />
    <link rel="stylesheet" href="<?php echo $assetRoot; ?>/css/animations.css" />
    <link rel="stylesheet" href="<?php echo $assetRoot; ?>/css/responsive.css" />
    <?php foreach ($extraStyles ?? [] as $href): ?>
    <link rel="stylesheet" href="<?php echo $href; ?>" />
    <?php endforeach; ?>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>

<body>