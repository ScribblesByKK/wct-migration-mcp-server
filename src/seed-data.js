/**
 * Hardcoded seed data for WCT v7.1.1 → v8.x migration mappings.
 * Loaded into SQLite on first boot if the DB is empty.
 */

export const KNOWN_PACKAGE_MAPPINGS = [
  { old: 'Microsoft.Toolkit.Uwp', new: 'CommunityToolkit.WinUI', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Controls', new: 'CommunityToolkit.WinUI.Controls', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid', new: null, notes: 'DataGrid not ported to v8. Use standalone 7.x DataGrid package or WinUI Community Gallery.', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Animations', new: 'CommunityToolkit.WinUI.Animations', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Behaviors', new: 'CommunityToolkit.WinUI.Behaviors', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Media', new: 'CommunityToolkit.WinUI.Media', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.Notifications', new: 'CommunityToolkit.WinUI.Notifications', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.DeveloperTools', new: 'CommunityToolkit.WinUI.DeveloperTools', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.Connectivity', new: 'CommunityToolkit.WinUI.Connectivity', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.UI', new: 'CommunityToolkit.WinUI.Extensions', type: 'package' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Controls.Primitives', new: 'CommunityToolkit.WinUI.Controls.Primitives', type: 'package' },
];

// Namespace mapping for code transformations
export const NAMESPACE_MAPPINGS = [
  { old: 'Microsoft.Toolkit.Uwp.UI.Controls', new: 'CommunityToolkit.WinUI.Controls' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Animations', new: 'CommunityToolkit.WinUI.Animations' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Behaviors', new: 'CommunityToolkit.WinUI.Behaviors' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Media', new: 'CommunityToolkit.WinUI.Media' },
  { old: 'Microsoft.Toolkit.Uwp.Helpers', new: 'CommunityToolkit.WinUI.Helpers' },
  { old: 'Microsoft.Toolkit.Uwp.UI.Extensions', new: 'CommunityToolkit.WinUI.Extensions' },
  { old: 'Microsoft.Toolkit.Uwp.Notifications', new: 'CommunityToolkit.WinUI.Notifications' },
];

export const KNOWN_API_MAPPINGS = [
  // Controls that moved to WinUI
  { old_api: 'Expander', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'moved_to_winui', new_api: 'Expander', new_package: 'Microsoft.WinUI', new_namespace: 'Microsoft.UI.Xaml.Controls', notes: 'Now built into WinUI. Use Microsoft.UI.Xaml.Controls.Expander directly.' },
  { old_api: 'NavigationView', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'moved_to_winui', new_api: 'NavigationView', new_package: 'Microsoft.WinUI', new_namespace: 'Microsoft.UI.Xaml.Controls', notes: 'Built into WinUI.' },
  { old_api: 'RadialGradientBrush', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'moved_to_winui', new_api: 'RadialGradientBrush', new_package: 'Microsoft.WinUI', new_namespace: 'Microsoft.UI.Xaml.Media', notes: 'Built into WinUI.' },
  { old_api: 'TabView', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'moved_to_winui', new_api: 'TabView', new_package: 'Microsoft.WinUI', new_namespace: 'Microsoft.UI.Xaml.Controls', notes: 'Now built into WinUI.' },

  // Controls removed with replacement
  { old_api: 'AdaptiveGridView', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'removed_with_replacement', new_api: 'UniformGridLayout', new_package: 'Microsoft.WinUI', new_namespace: 'Microsoft.UI.Xaml.Controls', notes: 'Use ItemsRepeater with UniformGridLayout.', usage_example: '```xml\n<ItemsRepeater.Layout>\n  <UniformGridLayout />\n</ItemsRepeater.Layout>\n```', breaking_changes: 'Complete API change. AdaptiveGridView properties do not map 1:1.' },
  { old_api: 'InAppNotification', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'removed_with_replacement', new_api: 'StackedNotificationsBehavior', new_package: 'CommunityToolkit.WinUI.Behaviors', new_namespace: 'CommunityToolkit.WinUI.Behaviors', notes: 'Use StackedNotificationsBehavior with InfoBar.', breaking_changes: 'Different API surface. Use InfoBar + StackedNotificationsBehavior pattern.' },
  { old_api: 'DropShadowPanel', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'removed_with_replacement', new_api: 'AttachedShadow', new_package: 'CommunityToolkit.WinUI.Media', new_namespace: 'CommunityToolkit.WinUI.Media', notes: 'Use attached shadow effects from Media package.', usage_example: '```xml\n<Border effects:Shadow.DropShadow="True" />\n```', breaking_changes: 'Panel-based API replaced with attached property.' },
  { old_api: 'MarkdownTextBlock', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'removed_with_replacement', new_api: 'MarkdownTextBlock', new_package: 'CommunityToolkit.Labs.WinUI.MarkdownTextBlock', new_namespace: 'CommunityToolkit.Labs.WinUI.MarkdownTextBlock', notes: 'New Markdig-based version in Toolkit Labs.', breaking_changes: 'Now in Labs package; some properties changed.' },

  // Controls removed without replacement
  { old_api: 'DataGrid', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid', status: 'removed_no_replacement', new_api: null, new_package: null, new_namespace: null, notes: 'Not ported. Continue using 7.x standalone package or use WinUI DataGrid from Gallery.' },

  // Direct renames (namespace change only)
  { old_api: 'BladeView', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'BladeView', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'BladeItem', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'BladeItem', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'CameraPreview', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'CameraPreview', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'Carousel', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'Carousel', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'DockPanel', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'DockPanel', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'GridSplitter', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'GridSplitter', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'HeaderedContentControl', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'HeaderedContentControl', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'HeaderedItemsControl', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'HeaderedItemsControl', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'HeaderedTreeView', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'HeaderedTreeView', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'ImageCropper', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'ImageCropper', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'ImageEx', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'ImageEx', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'LayoutTransformControl', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'LayoutTransformControl', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'Loading', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'Loading', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'MasterDetailsView', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'MasterDetailsView', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'Menu', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'Menu', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'MenuItem', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'MenuItem', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'MetadataControl', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'MetadataControl', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'OrbitView', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'OrbitView', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'RadialGauge', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'RadialGauge', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'RadialProgressBar', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'removed_with_replacement', new_api: 'ProgressRing', new_package: 'Microsoft.WinUI', new_namespace: 'Microsoft.UI.Xaml.Controls', notes: 'RadialProgressBar is deprecated in v8. Use WinUI ProgressRing with IsIndeterminate="True" instead.', usage_example: '```xml\n<ProgressRing IsIndeterminate="True" />\n```', breaking_changes: 'Complete API change. RadialProgressBar properties (Minimum, Maximum, Value, etc.) do not map to ProgressRing.' },
  { old_api: 'RangeSelector', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'RangeSelector', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'RotatorTile', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'RotatorTile', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'ScrollHeader', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'ScrollHeader', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'StaggeredLayout', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'StaggeredLayout', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'StaggeredPanel', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'StaggeredPanel', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'TextToolbar', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'TextToolbar', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'TileControl', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'TileControl', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'TokenizingTextBox', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'TokenizingTextBox', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'UniformGrid', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'UniformGrid', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },
  { old_api: 'WrapPanel', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls', status: 'direct_rename', new_api: 'WrapPanel', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'Namespace changed.' },

  // DataGrid types
  { old_api: 'DataGridColumn', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid', status: 'removed_no_replacement', new_api: null, new_package: null, new_namespace: null, notes: 'DataGrid not ported to v8.' },
  { old_api: 'DataGridTextColumn', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid', status: 'removed_no_replacement', new_api: null, new_package: null, new_namespace: null, notes: 'DataGrid not ported to v8.' },
  { old_api: 'DataGridCheckBoxColumn', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid', status: 'removed_no_replacement', new_api: null, new_package: null, new_namespace: null, notes: 'DataGrid not ported to v8.' },
  { old_api: 'DataGridComboBoxColumn', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid', status: 'removed_no_replacement', new_api: null, new_package: null, new_namespace: null, notes: 'DataGrid not ported to v8.' },
  { old_api: 'DataGridTemplateColumn', old_package: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid', status: 'removed_no_replacement', new_api: null, new_package: null, new_namespace: null, notes: 'DataGrid not ported to v8.' },

  // Behaviors
  { old_api: 'ViewportBehavior', old_package: 'Microsoft.Toolkit.Uwp.UI.Behaviors', status: 'direct_rename', new_api: 'ViewportBehavior', new_package: 'CommunityToolkit.WinUI.Behaviors', new_namespace: 'CommunityToolkit.WinUI.Behaviors', notes: 'Namespace changed.' },
  { old_api: 'FocusBehavior', old_package: 'Microsoft.Toolkit.Uwp.UI.Behaviors', status: 'direct_rename', new_api: 'FocusBehavior', new_package: 'CommunityToolkit.WinUI.Behaviors', new_namespace: 'CommunityToolkit.WinUI.Behaviors', notes: 'Namespace changed.' },
  { old_api: 'AutoFocusBehavior', old_package: 'Microsoft.Toolkit.Uwp.UI.Behaviors', status: 'direct_rename', new_api: 'AutoFocusBehavior', new_package: 'CommunityToolkit.WinUI.Behaviors', new_namespace: 'CommunityToolkit.WinUI.Behaviors', notes: 'Namespace changed.' },
  { old_api: 'KeyDownTriggerBehavior', old_package: 'Microsoft.Toolkit.Uwp.UI.Behaviors', status: 'direct_rename', new_api: 'KeyDownTriggerBehavior', new_package: 'CommunityToolkit.WinUI.Behaviors', new_namespace: 'CommunityToolkit.WinUI.Behaviors', notes: 'Namespace changed.' },
  { old_api: 'StackedNotificationsBehavior', old_package: 'Microsoft.Toolkit.Uwp.UI.Behaviors', status: 'direct_rename', new_api: 'StackedNotificationsBehavior', new_package: 'CommunityToolkit.WinUI.Behaviors', new_namespace: 'CommunityToolkit.WinUI.Behaviors', notes: 'Namespace changed.' },

  // Media
  { old_api: 'BackdropBlurBrush', old_package: 'Microsoft.Toolkit.Uwp.UI.Media', status: 'direct_rename', new_api: 'BackdropBlurBrush', new_package: 'CommunityToolkit.WinUI.Media', new_namespace: 'CommunityToolkit.WinUI.Media', notes: 'Namespace changed.' },
  { old_api: 'BackdropGammaTransferBrush', old_package: 'Microsoft.Toolkit.Uwp.UI.Media', status: 'direct_rename', new_api: 'BackdropGammaTransferBrush', new_package: 'CommunityToolkit.WinUI.Media', new_namespace: 'CommunityToolkit.WinUI.Media', notes: 'Namespace changed.' },
  { old_api: 'BackdropInvertBrush', old_package: 'Microsoft.Toolkit.Uwp.UI.Media', status: 'direct_rename', new_api: 'BackdropInvertBrush', new_package: 'CommunityToolkit.WinUI.Media', new_namespace: 'CommunityToolkit.WinUI.Media', notes: 'Namespace changed.' },
  { old_api: 'BackdropSaturationBrush', old_package: 'Microsoft.Toolkit.Uwp.UI.Media', status: 'direct_rename', new_api: 'BackdropSaturationBrush', new_package: 'CommunityToolkit.WinUI.Media', new_namespace: 'CommunityToolkit.WinUI.Media', notes: 'Namespace changed.' },
  { old_api: 'BackdropSepiaBrush', old_package: 'Microsoft.Toolkit.Uwp.UI.Media', status: 'direct_rename', new_api: 'BackdropSepiaBrush', new_package: 'CommunityToolkit.WinUI.Media', new_namespace: 'CommunityToolkit.WinUI.Media', notes: 'Namespace changed.' },
  { old_api: 'AttachedCardShadow', old_package: 'Microsoft.Toolkit.Uwp.UI.Media', status: 'direct_rename', new_api: 'AttachedCardShadow', new_package: 'CommunityToolkit.WinUI.Media', new_namespace: 'CommunityToolkit.WinUI.Media', notes: 'Namespace changed.' },

  // Animations
  { old_api: 'AnimationBuilder', old_package: 'Microsoft.Toolkit.Uwp.UI.Animations', status: 'direct_rename', new_api: 'AnimationBuilder', new_package: 'CommunityToolkit.WinUI.Animations', new_namespace: 'CommunityToolkit.WinUI.Animations', notes: 'Namespace changed.' },
  { old_api: 'ImplicitAnimationSet', old_package: 'Microsoft.Toolkit.Uwp.UI.Animations', status: 'direct_rename', new_api: 'ImplicitAnimationSet', new_package: 'CommunityToolkit.WinUI.Animations', new_namespace: 'CommunityToolkit.WinUI.Animations', notes: 'Namespace changed.' },
  { old_api: 'ExplicitAnimationSet', old_package: 'Microsoft.Toolkit.Uwp.UI.Animations', status: 'direct_rename', new_api: 'ExplicitAnimationSet', new_package: 'CommunityToolkit.WinUI.Animations', new_namespace: 'CommunityToolkit.WinUI.Animations', notes: 'Namespace changed.' },

  // Notifications
  { old_api: 'ToastContentBuilder', old_package: 'Microsoft.Toolkit.Uwp.Notifications', status: 'direct_rename', new_api: 'ToastContentBuilder', new_package: 'CommunityToolkit.WinUI.Notifications', new_namespace: 'CommunityToolkit.WinUI.Notifications', notes: 'Namespace changed.' },
  { old_api: 'TileContentBuilder', old_package: 'Microsoft.Toolkit.Uwp.Notifications', status: 'direct_rename', new_api: 'TileContentBuilder', new_package: 'CommunityToolkit.WinUI.Notifications', new_namespace: 'CommunityToolkit.WinUI.Notifications', notes: 'Namespace changed.' },
  { old_api: 'BadgeContentBuilder', old_package: 'Microsoft.Toolkit.Uwp.Notifications', status: 'direct_rename', new_api: 'BadgeContentBuilder', new_package: 'CommunityToolkit.WinUI.Notifications', new_namespace: 'CommunityToolkit.WinUI.Notifications', notes: 'Namespace changed.' },

  // Developer Tools
  { old_api: 'AlignmentGrid', old_package: 'Microsoft.Toolkit.Uwp.DeveloperTools', status: 'direct_rename', new_api: 'AlignmentGrid', new_package: 'CommunityToolkit.WinUI.DeveloperTools', new_namespace: 'CommunityToolkit.WinUI.DeveloperTools', notes: 'Namespace changed.' },
  { old_api: 'FocusTracker', old_package: 'Microsoft.Toolkit.Uwp.DeveloperTools', status: 'direct_rename', new_api: 'FocusTracker', new_package: 'CommunityToolkit.WinUI.DeveloperTools', new_namespace: 'CommunityToolkit.WinUI.DeveloperTools', notes: 'Namespace changed.' },

  // Connectivity
  { old_api: 'BluetoothLEHelper', old_package: 'Microsoft.Toolkit.Uwp.Connectivity', status: 'direct_rename', new_api: 'BluetoothLEHelper', new_package: 'CommunityToolkit.WinUI.Connectivity', new_namespace: 'CommunityToolkit.WinUI.Connectivity', notes: 'Namespace changed.' },
  { old_api: 'NetworkHelper', old_package: 'Microsoft.Toolkit.Uwp.Connectivity', status: 'direct_rename', new_api: 'NetworkHelper', new_package: 'CommunityToolkit.WinUI.Connectivity', new_namespace: 'CommunityToolkit.WinUI.Connectivity', notes: 'Namespace changed.' },

  // New in v8
  { old_api: null, old_package: null, status: 'new_in_v8', new_api: 'SettingsCard', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'New in v8.' },
  { old_api: null, old_package: null, status: 'new_in_v8', new_api: 'SettingsExpander', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'New in v8.' },
  { old_api: null, old_package: null, status: 'new_in_v8', new_api: 'Segmented', new_package: 'CommunityToolkit.WinUI.Controls', new_namespace: 'CommunityToolkit.WinUI.Controls', notes: 'New in v8.' },
];
