# -*- coding: utf-8 -*-
import zipfile
import sqlite3
import json
from pathlib import Path
from typing import Dict, Set, Optional, List, Tuple
import shutil
import hashlib
import re

class EVEDataInitializer:
    def __init__(self):
        self.sde_path = Path("sde")
        self.output_path = Path("docs") / "statics"
        self.icons_path = self.output_path / "icons"
        self.temp_icons_path = Path("icons_temp")
        self.models_path = Path("docs") / "models"
        self.extra_models_path = Path("docs") / "extra_models"
        
        # 清空输出目录
        if self.output_path.exists():
            shutil.rmtree(self.output_path)
        
        # 创建必要的目录
        self.output_path.mkdir(exist_ok=True)
        self.icons_path.mkdir(exist_ok=True, parents=True)
        
    def extract_zip_files(self):
        """解压sde目录下的zip文件"""
        print("开始解压文件...")
        
        # 解压图标文件到临时目录
        icons_zip_path = self.sde_path / "icons.zip"
        if icons_zip_path.exists():
            if self.temp_icons_path.exists():
                shutil.rmtree(self.temp_icons_path)
            self.temp_icons_path.mkdir(exist_ok=True)
            
            with zipfile.ZipFile(icons_zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.temp_icons_path)
            print(f"图标文件已解压")
        else:
            print(f"警告: 未找到图标文件 {icons_zip_path}")
        
        # 解压SDE文件（数据库文件在sde/db/目录下）
        sde_zip_path = self.sde_path / "sde.zip"
        if sde_zip_path.exists():
            with zipfile.ZipFile(sde_zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.sde_path)
            print(f"SDE文件已解压")
        else:
            print(f"警告: 未找到SDE文件 {sde_zip_path}")
    
    def connect_database(self, db_name: str) -> Optional[sqlite3.Connection]:
        """连接SQLite数据库"""
        db_file = self.sde_path / "db" / f"item_db_{db_name}.sqlite"
        if not db_file.exists():
            print(f"错误: 数据库文件不存在 {db_file}")
            return None
            
        try:
            conn = sqlite3.connect(db_file)
            conn.row_factory = sqlite3.Row
            print(f"{db_name.upper()}数据库连接成功")
            return conn
        except Exception as e:
            print(f"数据库连接失败: {e}")
            return None
    
    def load_data(self, conn: sqlite3.Connection, lang: str, extra_type_ids: list = None) -> Dict:
        """加载指定语言的数据（查询categoryID为6和65，以及额外指定的物品ID）"""
        print(f"加载{lang.upper()}数据...")
        
        if extra_type_ids is None:
            extra_type_ids = []
        
        # 构建查询条件：categoryID为6或65，或者type_id在额外列表中
        if extra_type_ids:
            placeholders = ','.join(['?'] * len(extra_type_ids))
            query = f"""
            SELECT 
                t.type_id,
                t.en_name,
                t.zh_name,
                t.categoryID,
                t.groupID,
                t.icon_filename,
                c.name as category_name,
                c.icon_filename AS category_icon_name,
                g.name as group_name,
                g.icon_filename AS group_icon_name
            FROM types t
            LEFT JOIN categories c ON t.categoryID = c.category_id
            LEFT JOIN groups g ON t.groupID = g.group_id
            WHERE (t.categoryID IN (6, 65) AND t.published = 1)
               OR t.type_id IN ({placeholders})
            """
            cursor = conn.execute(query, extra_type_ids)
        else:
            query = """
            SELECT 
                t.type_id,
                t.en_name,
                t.zh_name,
                t.categoryID,
                t.groupID,
                t.icon_filename,
                c.name as category_name,
                c.icon_filename AS category_icon_name,
                g.name as group_name,
                g.icon_filename AS group_icon_name
            FROM types t
            LEFT JOIN categories c ON t.categoryID = c.category_id
            LEFT JOIN groups g ON t.groupID = g.group_id
            WHERE t.categoryID IN (6, 65) AND t.published = 1
            """
            cursor = conn.execute(query)
        categories = {}
        groups = {}
        types = {}
        icon_names = set()
        
        # 根据语言选择名称字段
        name_field = 'zh_name' if lang == 'zh' else 'en_name'
        
        for row in cursor:
            type_id = row['type_id']
            category_id = row['categoryID']
            group_id = row['groupID']
            
            # 收集类型信息（同时保存中英文名称）
            types[type_id] = {
                'id': type_id,
                'name': row[name_field] or row['en_name'],
                'name_en': row['en_name'] or '',
                'name_zh': row['zh_name'] or '',
                'categoryID': category_id,
                'groupID': group_id,
                'icon_name': row['icon_filename']
            }
            # 收集类型图标名称
            if row['icon_filename']:
                icon_names.add(row['icon_filename'])
            
            # 收集分类信息
            if category_id and category_id not in categories:
                categories[category_id] = {
                    'id': category_id,
                    'name': row['category_name'] or '',
                    'icon_name': row['category_icon_name']
                }
                if row['category_icon_name']:
                    icon_names.add(row['category_icon_name'])
            
            # 收集组信息
            if group_id and group_id not in groups:
                groups[group_id] = {
                    'id': group_id,
                    'name': row['group_name'] or '',
                    'categoryID': category_id,
                    'icon_name': row['group_icon_name']
                }
                if row['group_icon_name']:
                    icon_names.add(row['group_icon_name'])
        
        # 如果有额外物品ID，输出统计信息
        if extra_type_ids:
            extra_found = [tid for tid in extra_type_ids if tid in types]
            if extra_found:
                print(f"  额外物品ID中找到 {len(extra_found)} 个物品: {extra_found}")
            missing = [tid for tid in extra_type_ids if tid not in types]
            if missing:
                print(f"  警告: 额外物品ID中未找到 {len(missing)} 个物品: {missing}")
        
        print(f"  加载了 {len(types)} 个类型，{len(categories)} 个分类，{len(groups)} 个组")
        
        return {
            'categories': categories,
            'groups': groups,
            'types': types,
            'icon_names': icon_names
        }
    
    def build_category_tree(self, data: Dict, model_map: Dict[int, str] = None, all_file_info: List[Dict] = None) -> list:
        """构建category -> group -> type树结构，对于group 963增加第四层variants"""
        categories = data['categories']
        groups = data['groups']
        types = data['types']
        
        if model_map is None:
            model_map = {}
        if all_file_info is None:
            all_file_info = []
        
        # 为每个typeid构建变体列表（用于group 963）
        typeid_variants = {}
        for file_info in all_file_info:
            typeid = file_info['typeid']
            if typeid not in typeid_variants:
                typeid_variants[typeid] = []
            typeid_variants[typeid].append({
                'variant': file_info.get('variant'),
                'model_path': file_info['relative_path'],
                'filename': file_info.get('filename', '')
            })
        
        # 构建树结构
        category_map = {}
        
        # 初始化所有category节点
        for category_id, category_info in categories.items():
            category_map[category_id] = {
                'id': category_id,
                'name': category_info['name'],
                'icon_name': category_info.get('icon_name'),
                'groups': {}
            }
        
        # 添加groups到categories
        for group_id, group_info in groups.items():
            category_id = group_info.get('categoryID')
            if category_id:
                # 如果category不在map中，需要先创建（用于额外物品ID的情况）
                if category_id not in category_map:
                    category_map[category_id] = {
                        'id': category_id,
                        'name': categories.get(category_id, {}).get('name', f'分类 {category_id}'),
                        'icon_name': categories.get(category_id, {}).get('icon_name'),
                        'groups': {}
                    }
                # 添加group到category
                category_map[category_id]['groups'][group_id] = {
                    'id': group_id,
                    'name': group_info['name'],
                    'icon_name': group_info.get('icon_name'),
                    'types': [],
                    'is_t3_cruiser': (group_id == 963)  # 标记是否为T3巡洋舰
                }
        
        # 添加types到groups
        for type_id, type_info in types.items():
            category_id = type_info.get('categoryID')
            group_id = type_info.get('groupID')
            
            if category_id and group_id:
                # 如果category不在map中，需要先创建（用于额外物品ID的情况）
                if category_id not in category_map:
                    category_map[category_id] = {
                        'id': category_id,
                        'name': categories.get(category_id, {}).get('name', f'分类 {category_id}'),
                        'icon_name': categories.get(category_id, {}).get('icon_name'),
                        'groups': {}
                    }
                
                # 如果group不在category的groups中，需要先创建
                if group_id not in category_map[category_id]['groups']:
                    category_map[category_id]['groups'][group_id] = {
                        'id': group_id,
                        'name': groups.get(group_id, {}).get('name', f'组 {group_id}'),
                        'icon_name': groups.get(group_id, {}).get('icon_name'),
                        'types': [],
                        'is_t3_cruiser': (group_id == 963)
                    }
                
                # 检查是否为group 963（T3巡洋舰）
                is_t3_cruiser = (group_id == 963)
                
                if is_t3_cruiser and type_id in typeid_variants:
                    # 对于T3巡洋舰，构建变体列表
                    variants_list = []
                    default_model_path = None
                    
                    for variant_info in typeid_variants[type_id]:
                        variant_code = variant_info['variant']
                        # 构建变体名称
                        if variant_code:
                            variant_name = f"{type_info['name']}（{variant_code}）"
                            variant_name_en = f"{type_info.get('name_en', '')} ({variant_code})"
                            variant_name_zh = f"{type_info.get('name_zh', '')}（{variant_code}）"
                        else:
                            variant_name = type_info['name']
                            variant_name_en = type_info.get('name_en', '')
                            variant_name_zh = type_info.get('name_zh', '')
                            # 找到无变体数值的文件，作为默认模型
                            default_model_path = variant_info['model_path']
                        
                        variants_list.append({
                            'variant_code': variant_code or '',
                            'name': variant_name,
                            'name_en': variant_name_en,
                            'name_zh': variant_name_zh,
                            'model_path': variant_info['model_path']
                        })
                    
                    # 按变体代码排序
                    variants_list.sort(key=lambda x: x['variant_code'])
                    
                    # 如果没有找到无变体的默认模型，使用第一个变体
                    if not default_model_path and variants_list:
                        default_model_path = variants_list[0]['model_path']
                    
                    # 添加带变体的type
                    category_map[category_id]['groups'][group_id]['types'].append({
                        'id': type_id,
                        'name': type_info['name'],
                        'name_en': type_info.get('name_en', ''),
                        'name_zh': type_info.get('name_zh', ''),
                        'icon_name': type_info.get('icon_name'),
                        'has_variants': True,
                        'model_path': default_model_path or '',
                        'variants': variants_list
                    })
                else:
                    # 对于普通物品，使用原有逻辑
                    model_path = model_map.get(type_id, '')
                    
                    category_map[category_id]['groups'][group_id]['types'].append({
                        'id': type_id,
                        'name': type_info['name'],
                        'name_en': type_info.get('name_en', ''),
                        'name_zh': type_info.get('name_zh', ''),
                        'icon_name': type_info.get('icon_name'),
                        'has_variants': False,
                        'model_path': model_path
                    })
        
        # 转换为列表并排序（按名称排序）
        result = []
        for category in category_map.values():
            category['groups'] = list(category['groups'].values())
            category['groups'].sort(key=lambda x: x['name'])
            for group in category['groups']:
                group['types'].sort(key=lambda x: x['name'])
            result.append(category)
        
        result.sort(key=lambda x: x['name'])
        return result
    
    def calculate_file_hash(self, file_path: Path) -> str:
        """计算文件的 SHA256 哈希值"""
        sha256_hash = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                # 分块读取，避免大文件占用过多内存
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            print(f"  警告: 计算文件哈希失败 {file_path}: {e}")
            return ""
    
    def extract_variant_info(self, filename: str) -> Optional[str]:
        """
        从文件名中提取变体信息（用于group 963的T3巡洋舰）
        例如: 29984_Tengu2312_caldaribase_lite.glb -> 2312
        返回4位数字字符串，如果没有则返回None
        """
        parts = filename.split('_')
        if len(parts) >= 2:
            # 提取第二段
            second_part = parts[1]
            # 尝试提取末尾4位数字
            match = re.search(r'(\d{4})$', second_part)
            if match:
                return match.group(1)
        return None
    
    def scan_models(self) -> Tuple[Dict[int, str], List[Dict]]:
        """扫描models目录，提取模型文件信息，返回模型映射和文件信息列表（包含哈希）"""
        print("扫描模型文件...")
        
        model_map = {}
        file_info_list = []  # 存储文件信息：typeid, path, hash, variant
        
        if not self.models_path.exists():
            print(f"  警告: 模型目录不存在 {self.models_path}")
            return model_map, file_info_list
        
        # 支持的模型文件扩展名
        model_extensions = {'.glb', '.gltf'}
        
        # 获取所有模型文件
        model_files = [f for f in self.models_path.iterdir() 
                      if f.is_file() and f.suffix.lower() in model_extensions]
        
        print(f"  找到 {len(model_files)} 个模型文件，开始计算哈希值...")
        
        # 扫描所有模型文件并计算哈希
        for idx, model_file in enumerate(model_files, 1):
            if idx % 50 == 0 or idx == len(model_files):
                print(f"    进度: {idx}/{len(model_files)} ({idx*100//len(model_files)}%)")
            
            # 按下划线分割文件名，取第一位作为id
            filename_without_ext = model_file.stem
            parts = filename_without_ext.split('_')
            model_id_str = parts[0]
            
            try:
                model_id = int(model_id_str)
            except ValueError:
                print(f"  警告: 无法解析模型ID: {model_file.name} (提取的ID: {model_id_str})")
                continue
            
            # 计算文件哈希
            file_hash = self.calculate_file_hash(model_file)
            if not file_hash:
                continue
            
            # 提取变体信息（用于group 963）
            variant = self.extract_variant_info(filename_without_ext)
            
            # 记录模型路径（相对于docs目录）
            model_path = f"./models/{model_file.name}"
            
            # 记录文件信息（包含变体信息）
            file_info_list.append({
                'typeid': model_id,
                'path': model_file,
                'relative_path': model_path,
                'hash': file_hash,
                'variant': variant,
                'filename': model_file.name
            })
            
            # 对于非变体情况，保留原有的简单映射
            if model_id not in model_map:
                model_map[model_id] = model_path
        
        print(f"  扫描到 {len(file_info_list)} 个模型文件（包含变体）")
        return model_map, file_info_list
    
    def scan_extra_models(self) -> Tuple[Dict[int, str], List[Dict]]:
        """扫描extra_models目录，提取额外物品ID和文件映射，返回模型映射和文件信息列表（包含哈希）"""
        print("扫描额外模型目录...")
        
        extra_models_map = {}
        file_info_list = []  # 存储文件信息：typeid, path, hash, variant
        
        if not self.extra_models_path.exists():
            print(f"  提示: 额外模型目录不存在 {self.extra_models_path}，跳过")
            return extra_models_map, file_info_list
        
        # 支持的模型文件扩展名
        model_extensions = {'.glb', '.gltf'}
        
        # 获取所有模型文件
        model_files = [f for f in self.extra_models_path.iterdir() 
                      if f.is_file() and f.suffix.lower() in model_extensions]
        
        print(f"  找到 {len(model_files)} 个模型文件，开始计算哈希值...")
        
        # 扫描所有模型文件并计算哈希
        for idx, model_file in enumerate(model_files, 1):
            if idx % 50 == 0 or idx == len(model_files):
                print(f"    进度: {idx}/{len(model_files)} ({idx*100//len(model_files)}%)")
            
            # 按下划线分割文件名，取第一位作为id
            filename_without_ext = model_file.stem
            parts = filename_without_ext.split('_')
            model_id_str = parts[0]
            
            try:
                model_id = int(model_id_str)
            except ValueError:
                print(f"  警告: 无法解析额外模型ID: {model_file.name} (提取的ID: {model_id_str})")
                continue
            
            # 计算文件哈希
            file_hash = self.calculate_file_hash(model_file)
            if not file_hash:
                continue
            
            # 提取变体信息（用于group 963）
            variant = self.extract_variant_info(filename_without_ext)
            
            # 记录文件路径（相对于docs目录）
            file_path = f"./extra_models/{model_file.name}"
            
            # 记录文件信息（包含变体信息）
            file_info_list.append({
                'typeid': model_id,
                'path': model_file,
                'relative_path': file_path,
                'hash': file_hash,
                'variant': variant,
                'filename': model_file.name
            })
            
            # 对于非变体情况，保留原有的简单映射
            if model_id not in extra_models_map:
                extra_models_map[model_id] = file_path
        
        print(f"  从额外模型目录中提取了 {len(file_info_list)} 个模型文件（包含变体）")
        return extra_models_map, file_info_list
    
    def check_duplicate_files(self, model_file_info: List[Dict], extra_file_info: List[Dict]):
        """检查models和extra_models目录是否有完全相同的文件名"""
        model_filenames = {info['filename']: info['relative_path'] for info in model_file_info}
        extra_filenames = {info['filename']: info['relative_path'] for info in extra_file_info}
        
        duplicate_files = set(model_filenames.keys()) & set(extra_filenames.keys())
        
        if duplicate_files:
            error_msg = f"\n错误: 发现 {len(duplicate_files)} 个重复的文件名，这些文件同时存在于models和extra_models目录中:\n"
            for dup_file in sorted(duplicate_files):
                error_msg += f"  文件 {dup_file}:\n"
                error_msg += f"    - models目录: {model_filenames[dup_file]}\n"
                error_msg += f"    - extra_models目录: {extra_filenames[dup_file]}\n"
            error_msg += "\n请移除其中一个目录中的文件，确保每个文件名只在一个目录中出现。\n"
            raise ValueError(error_msg)
    
    def deduplicate_model_mapping(self, file_info_list: List[Dict]) -> Dict[int, str]:
        """
        根据文件哈希值复用模型文件，对于哈希相同的文件，让所有 typeid 都指向 typeid 最小的文件
        但对于有变体标识的文件（variant不为None），不参与去重，保留所有变体
        不删除任何文件，只是更新映射关系以实现复用
        返回: 去重后的模型映射（所有相同哈希的 typeid 都指向保留的文件）
        """
        print("检测重复文件并建立复用映射...")
        
        if not file_info_list:
            return {}
        
        # 分离变体文件和普通文件
        variant_files = [f for f in file_info_list if f.get('variant') is not None]
        normal_files = [f for f in file_info_list if f.get('variant') is None]
        
        print(f"  变体文件: {len(variant_files)} 个（不参与去重）")
        print(f"  普通文件: {len(normal_files)} 个（参与去重）")
        
        # 构建结果映射
        result_map = {}
        
        # 变体文件直接保留，不去重
        for file_info in variant_files:
            typeid = file_info['typeid']
            # 对于变体文件，使用文件名作为键的一部分来保证唯一性
            # 但在实际映射中，我们需要保留完整路径信息
            result_map[typeid] = file_info['relative_path']
        
        # 按哈希值分组普通文件
        hash_groups: Dict[str, List[Dict]] = {}
        for file_info in normal_files:
            file_hash = file_info['hash']
            if file_hash not in hash_groups:
                hash_groups[file_hash] = []
            hash_groups[file_hash].append(file_info)
        
        # 找出重复的哈希值（组内文件数 > 1）
        duplicate_groups = {h: files for h, files in hash_groups.items() if len(files) > 1}
        
        reused_count = 0
        
        # 处理每个重复组
        for file_hash, files in duplicate_groups.items():
            # 按 typeid 排序，保留最小的作为复用目标
            files_sorted = sorted(files, key=lambda x: x['typeid'])
            keep_file = files_sorted[0]
            reuse_files = files_sorted[1:]
            
            # 保留文件自己的映射
            result_map[keep_file['typeid']] = keep_file['relative_path']
            
            # 让所有重复文件的 typeid 都指向保留文件
            for reuse_file in reuse_files:
                result_map[reuse_file['typeid']] = keep_file['relative_path']
                reused_count += 1
            
            # 输出详细信息
            print(f"    哈希 {file_hash[:16]}...:")
            print(f"      复用目标: {keep_file['path'].name} (typeid: {keep_file['typeid']})")
            for reuse_file in reuse_files:
                print(f"        复用: {reuse_file['path'].name} (typeid: {reuse_file['typeid']}) -> 指向 {keep_file['path'].name}")
        
        # 处理非重复的普通文件（直接使用自己的路径）
        for file_hash, files in hash_groups.items():
            if file_hash not in duplicate_groups:
                for file_info in files:
                    result_map[file_info['typeid']] = file_info['relative_path']
        
        if duplicate_groups:
            print(f"  复用完成: {len(duplicate_groups)} 组重复文件，{reused_count} 个 typeid 复用已有文件")
        else:
            print("  未发现重复文件，无需复用")
        
        print(f"  映射关系: {len(result_map)} 个条目（包含 {len(variant_files)} 个变体文件）")
        
        return result_map
    
    def extract_icons(self, icon_names: Set[str]):
        """提取所需的图标文件到static/icons目录"""
        print(f"提取 {len(icon_names)} 个图标文件...")
        
        extracted_count = 0
        for icon_name in icon_names:
            if not icon_name:
                continue
            
            icon_name_normalized = icon_name.replace('\\', '/')
            source_file = self.temp_icons_path / icon_name_normalized
            
            # 尝试只使用文件名查找
            if not source_file.exists():
                icon_filename = Path(icon_name_normalized).name
                source_file_flat = self.temp_icons_path / icon_filename
                if source_file_flat.exists():
                    source_file = source_file_flat
                    icon_name_normalized = icon_filename
            
            dest_file = self.icons_path / icon_name_normalized
            
            if source_file.exists():
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source_file, dest_file)
                extracted_count += 1
        
        print(f"  提取了 {extracted_count} 个图标文件")
    
    def save_index(self, category_tree: list, lang: str):
        """保存索引文件"""
        output_file = self.output_path / f"resources_index_{lang}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(category_tree, f, ensure_ascii=False, indent=2)
        print(f"  {lang.upper()}索引已保存: {output_file}")
    
    def save_available_models(self, model_map: Dict[int, str]):
        """保存有模型的物品ID列表"""
        available_ids = sorted(model_map.keys())
        output_data = {"available": available_ids}
        output_file = self.output_path / "available_models.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"  可用模型ID列表已保存: {output_file} (共 {len(available_ids)} 个)")
    
    def cleanup(self):
        """清理临时文件"""
        print("清理临时文件...")
        
        if self.temp_icons_path.exists():
            shutil.rmtree(self.temp_icons_path)
        
        print("  清理完成")
    
    def run(self):
        """运行完整的初始化流程"""
        print("开始EVE数据初始化...")
        print("=" * 50)
        
        try:
            # 1. 解压文件
            self.extract_zip_files()
            
            # 2. 连接数据库
            conn_zh = self.connect_database("zh")
            conn_en = self.connect_database("en")
            
            if not conn_zh or not conn_en:
                print("错误: 需要中英文数据库")
                return
            
            try:
                # 3. 扫描模型文件（包含哈希计算）
                model_map, model_file_info = self.scan_models()
                
                # 4. 扫描额外模型目录，提取额外物品ID（包含哈希计算）
                extra_models_map, extra_file_info = self.scan_extra_models()
                
                # 5. 检查两个目录是否有重复的文件名
                self.check_duplicate_files(model_file_info, extra_file_info)
                
                # 6. 合并文件信息列表，进行哈希去重
                all_file_info = model_file_info + extra_file_info
                
                # 7. 根据哈希值建立复用映射（不删除文件，只更新映射关系）
                combined_model_map = self.deduplicate_model_mapping(all_file_info)
                
                # 9. 提取额外物品ID列表用于数据加载（使用去重后的映射）
                extra_type_ids = [tid for tid in extra_models_map.keys() if tid in combined_model_map]
                
                # 10. 加载中文数据
                data_zh = self.load_data(conn_zh, 'zh', extra_type_ids)
                tree_zh = self.build_category_tree(data_zh, combined_model_map, all_file_info)
                
                # 11. 加载英文数据
                data_en = self.load_data(conn_en, 'en', extra_type_ids)
                tree_en = self.build_category_tree(data_en, combined_model_map, all_file_info)
                
                # 12. 提取图标（合并中英文的图标需求）
                all_icons = data_zh['icon_names'] | data_en['icon_names']
                self.extract_icons(all_icons)
                
                # 13. 保存索引文件
                print("保存索引文件...")
                self.save_index(tree_zh, 'cn')
                self.save_index(tree_en, 'en')
                
                # 14. 保存有模型的物品ID列表（包含两个目录的模型，已去重）
                print("保存可用模型列表...")
                self.save_available_models(combined_model_map)
                
            finally:
                conn_zh.close()
                conn_en.close()
                print("数据库连接已关闭")
            
            # 7. 清理临时文件
            self.cleanup()
            
            print("\n初始化完成！")
            print("=" * 50)
                
        except Exception as e:
            print(f"初始化过程中发生错误: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    initializer = EVEDataInitializer()
    initializer.run()
